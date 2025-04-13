import { useRef, useState, useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { Line, Html } from '@react-three/drei'
import { type Dimension, type Tool } from './sketch-controls'

interface SketchPlaneProps {
  dimension: Dimension
  tool: Tool
  isActive: boolean
  gridSize: number
  gridDivisions: number
  persistDrawings?: boolean
}

interface Point3D {
  x: number
  y: number
  z: number
}

interface DrawingItem {
  id: string
  tool: Tool
  color: string
  points: Point3D[]
  dimension: Dimension // Track which dimension this drawing belongs to
}

// Global store to keep drawings across component rerenders
const globalDrawings: Record<Dimension, DrawingItem[]> = {
  x: [],
  y: [],
  z: []
};

export default function SketchPlane({
  dimension,
  tool,
  isActive,
  gridSize = 100,
  gridDivisions = 100,
  persistDrawings = false
}: SketchPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [drawings, setDrawings] = useState<DrawingItem[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentDrawing, setCurrentDrawing] = useState<DrawingItem | null>(null)
  const { raycaster, mouse, camera } = useThree()
  
  // Load initial drawings from global store for this dimension
  useEffect(() => {
    if (persistDrawings) {
      setDrawings(globalDrawings[dimension]);
    }
  }, [dimension, persistDrawings]);
  
  // Update global store whenever drawings change
  useEffect(() => {
    if (persistDrawings) {
      globalDrawings[dimension] = drawings;
    }
  }, [drawings, dimension, persistDrawings]);
  
  // Position and rotation based on dimension
  const planeConfig = {
    x: {
      position: [0, 0, 0],
      rotation: [0, Math.PI / 2, 0],
      color: '#ff7b7b'
    },
    y: {
      position: [0, 0, 0],
      rotation: [Math.PI / 2, 0, 0],
      color: '#7bff7b'
    },
    z: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      color: '#7b7bff'
    }
  }

  // Snap to grid
  const snapToGrid = (value: number): number => {
    const cellSize = gridSize / gridDivisions
    return Math.round(value / cellSize) * cellSize
  }

  // Listen for keyboard shortcuts
  useEffect(() => {
    if (!isActive) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        // Escape cancels current drawing
        if (isDrawing) {
          setIsDrawing(false)
          setCurrentDrawing(null)
        }
      } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        // Undo last drawing
        e.preventDefault()
        setDrawings(prev => {
          const newDrawings = prev.slice(0, -1);
          globalDrawings[dimension] = newDrawings; // Update global store
          return newDrawings;
        })
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, isDrawing, dimension])

  // Get snapped point from intersection
  const getSnappedPoint = (intersection: THREE.Intersection): Point3D | null => {
    if (!intersection || !intersection.point) return null
    
    const point = intersection.point
    
    return {
      x: snapToGrid(point.x),
      y: snapToGrid(point.y),
      z: snapToGrid(point.z)
    }
  }

  // Update raycaster on pointer move to detect intersections
  useEffect(() => {
    const handlePointerMove = () => {
      if (!isActive || !isDrawing || !currentDrawing || !meshRef.current) return
      
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObject(meshRef.current)
      
      if (intersects.length > 0 && intersects[0]) {
        const snappedPoint = getSnappedPoint(intersects[0])
        if (!snappedPoint) return
        
        if (tool === 'pencil') {
          // For pencil, add point to the drawing
          setCurrentDrawing({
            ...currentDrawing,
            points: [...currentDrawing.points, snappedPoint]
          })
        } else if (tool === 'rectangle' && currentDrawing.points.length > 0) {
          // For rectangle, update the end point
          const firstPoint = currentDrawing.points[0]
          if (firstPoint) {
            setCurrentDrawing({
              ...currentDrawing,
              points: [firstPoint, snappedPoint]
            })
          }
        }
      }
    }

    // Add listener to the window
    window.addEventListener('pointermove', handlePointerMove)
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
    }
  }, [isActive, isDrawing, currentDrawing, camera, mouse, raycaster, tool])

  // Handle click - toggles drawing on/off
  const handleClick = () => {
    if (!isActive || !meshRef.current) return
    
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObject(meshRef.current)
    
    if (intersects.length > 0 && intersects[0]) {
      // If already drawing, finish the drawing
      if (isDrawing && currentDrawing) {
        // Only save drawings with at least 2 points
        if (currentDrawing.points.length >= 2) {
          const newDrawings = [...drawings, currentDrawing];
          setDrawings(newDrawings);
          if (persistDrawings) {
            globalDrawings[dimension] = newDrawings; // Update global store
          }
        }
        
        setIsDrawing(false)
        setCurrentDrawing(null)
        return
      }
      
      // Otherwise, start a new drawing
      const snappedPoint = getSnappedPoint(intersects[0])
      if (!snappedPoint) return
      
      setIsDrawing(true)
      setCurrentDrawing({
        id: Date.now().toString(),
        tool,
        color: '#000000',
        points: [snappedPoint],
        dimension // Track which dimension this drawing belongs to
      })
    }
  }

  // Convert points for line rendering based on dimension
  const getLinePoints = (points: Point3D[]): [number, number, number][] => {
    if (!points || points.length === 0) return []
    
    return points.map((p): [number, number, number] => {
      if (dimension === 'x') {
        // For X plane (YZ plane)
        return [0.01, p.y, p.z] 
      } else if (dimension === 'y') {
        // For Y plane (XZ plane)
        return [p.x, 0.01, p.z]
      } else {
        // For Z plane (XY plane)
        return [p.x, p.y, 0.01]
      }
    })
  }

  // Get rectangle points from start and end
  const getRectanglePoints = (start: Point3D, end: Point3D): [number, number, number][] => {
    if (dimension === 'x') {
      // For X plane (YZ plane)
      return [
        [0.01, start.y, start.z],
        [0.01, start.y, end.z],
        [0.01, end.y, end.z],
        [0.01, end.y, start.z],
        [0.01, start.y, start.z]
      ]
    } else if (dimension === 'y') {
      // For Y plane (XZ plane)
      return [
        [start.x, 0.01, start.z],
        [end.x, 0.01, start.z],
        [end.x, 0.01, end.z],
        [start.x, 0.01, end.z],
        [start.x, 0.01, start.z]
      ]
    } else {
      // For Z plane (XY plane)
      return [
        [start.x, start.y, 0.01],
        [end.x, start.y, 0.01],
        [end.x, end.y, 0.01],
        [start.x, end.y, 0.01],
        [start.x, start.y, 0.01]
      ]
    }
  }

  // Safe renderer for rectangle that checks for undefined points
  const renderRectangle = (drawing: DrawingItem) => {
    if (drawing.points.length < 2) return null
    const start = drawing.points[0]
    const end = drawing.points[1]
    if (!start || !end) return null
    
    return (
      <Line
        key={drawing.id}
        points={getRectanglePoints(start, end)}
        color={drawing.color}
        lineWidth={3}
      />
    )
  }

  return (
    <>
      {/* Drawing plane */}
      <mesh
        ref={meshRef}
        position={planeConfig[dimension].position as any}
        rotation={planeConfig[dimension].rotation as any}
        visible={isActive}
        onClick={handleClick}
      >
        <planeGeometry args={[gridSize, gridSize]} />
        <meshBasicMaterial 
          color={planeConfig[dimension].color}
          transparent={true}
          opacity={isDrawing ? 0.2 : 0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Render existing drawings */}
      {drawings.map((drawing) => (
        drawing.tool === 'pencil' ? (
          <Line
            key={drawing.id}
            points={getLinePoints(drawing.points)}
            color={drawing.color}
            lineWidth={3}
          />
        ) : drawing.tool === 'rectangle' && drawing.points.length >= 2 ? 
          renderRectangle(drawing) : null
      ))}

      {/* Render current drawing */}
      {isActive && currentDrawing && (
        <>
          {currentDrawing.tool === 'pencil' && currentDrawing.points.length >= 2 && (
            <Line
              points={getLinePoints(currentDrawing.points)}
              color="#ff0000"
              lineWidth={3}
            />
          )}
          {currentDrawing.tool === 'rectangle' && currentDrawing.points.length >= 2 && 
            currentDrawing.points[0] && currentDrawing.points[1] && (
            <Line
              points={getRectanglePoints(currentDrawing.points[0], currentDrawing.points[1])}
              color="#ff0000"
              lineWidth={3}
            />
          )}
        </>
      )}
    </>
  )
} 