import { useRef, useState, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { type Dimension, type Tool } from './sketch-controls'
import { type Point3D, type DrawingItem, documentSketchesAtom } from '../(protected)/atoms'
import { useAtom } from 'jotai'
import { useParams } from 'next/navigation'

interface SketchPlaneProps {
  dimension: Dimension
  tool: Tool
  isActive: boolean
  gridSize: number
  gridDivisions: number
  persistDrawings?: boolean
}

export default function SketchPlane({
  dimension,
  tool,
  isActive,
  gridSize = 100,
  gridDivisions = 100,
  persistDrawings = false
}: SketchPlaneProps) {
  const params = useParams();
  const documentId = params.documentId as string;
  const [documentSketches, setDocumentSketches] = useAtom(documentSketchesAtom(documentId))
  const meshRef = useRef<THREE.Mesh>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentSketch, setCurrentSketch] = useState<DrawingItem | null>(null)
  const { raycaster, mouse, camera } = useThree()
  
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

  // Snap to grid - move before getSnappedPoint and wrap in useCallback
  const snapToGrid = useCallback((value: number): number => {
    const cellSize = gridSize / gridDivisions
    return Math.round(value / cellSize) * cellSize
  }, [gridSize, gridDivisions]);
  
  // Convert points for line rendering based on dimension
  const getLinePoints = (points: Point3D[], pointDimension: Dimension): [number, number, number][] => {
    if (!points || points.length === 0) return []
    
    return points.map((p): [number, number, number] => {
      if (pointDimension === 'x') {
        // For X plane (YZ plane)
        return [0.01, p.y, p.z] 
      } else if (pointDimension === 'y') {
        // For Y plane (XZ plane)
        return [p.x, 0.01, p.z]
      } else {
        // For Z plane (XY plane)
        return [p.x, p.y, 0.01]
      }
    })
  }

  // Get rectangle points from start and end
  const getRectanglePoints = (start: Point3D, end: Point3D, pointDimension: Dimension): [number, number, number][] => {
    if (pointDimension === 'x') {
      // For X plane (YZ plane)
      return [
        [0.01, start.y, start.z],
        [0.01, start.y, end.z],
        [0.01, end.y, end.z],
        [0.01, end.y, start.z],
        [0.01, start.y, start.z]
      ]
    } else if (pointDimension === 'y') {
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
        points={getRectanglePoints(start, end, drawing.dimension)}
        color={drawing.color}
        lineWidth={3}
      />
    )
  }
  
  // Get snapped point from intersection - wrapped in useCallback
  const getSnappedPoint = useCallback((intersection: THREE.Intersection): Point3D | null => {
    if (!intersection?.point) return null
    
    const point = intersection.point
    
    return {
      x: snapToGrid(point.x),
      y: snapToGrid(point.y),
      z: snapToGrid(point.z)
    }
  }, [snapToGrid]);

  // Handle click - toggles drawing on/off
  const handleClick = () => {
    if (!isActive || !meshRef.current) return
    
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObject(meshRef.current)
    
    if (intersects.length > 0 && intersects[0]) {
      // If already drawing, finish the drawing
      if (isDrawing && currentSketch) {
        // Only save drawings with at least 2 points
        if (currentSketch.points.length >= 2) {
          const newDrawings = [...documentSketches[dimension], currentSketch];
          setDocumentSketches({
            ...documentSketches,
            [dimension]: newDrawings
          });
          if (persistDrawings) {
            documentSketches[dimension] = newDrawings; // Update global store
          }
        }
        
        setIsDrawing(false)
        setCurrentSketch(null)
        return
      }
      
      // Otherwise, start a new drawing
      const snappedPoint = getSnappedPoint(intersects[0])
      if (!snappedPoint) return
      
      setIsDrawing(true)
      setCurrentSketch({
        id: Date.now().toString(),
        tool,
        color: '#000000',
        points: [snappedPoint],
        dimension // Track which dimension this drawing belongs to
      })
    }
  }
  
  // Listen for keyboard shortcuts
  useEffect(() => {
    if (!isActive) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        // Escape cancels current drawing
        if (isDrawing) {
          setIsDrawing(false)
          setCurrentSketch(null)
        }
      } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        // Undo last drawing
        e.preventDefault()
        setDocumentSketches({
          ...documentSketches,
          [dimension]: documentSketches[dimension].slice(0, -1)
        })
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, isDrawing, dimension, setDocumentSketches, documentSketches]);

  // Update raycaster on pointer move to detect intersections
  useEffect(() => {
    const handlePointerMove = () => {
      if (!isActive || !isDrawing || !currentSketch || !meshRef.current) return
      
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObject(meshRef.current)
      
      if (intersects.length > 0 && intersects[0]) {
        const snappedPoint = getSnappedPoint(intersects[0])
        if (!snappedPoint) return
        
        if (tool === 'pencil') {
          // For pencil, add point to the drawing
          setCurrentSketch({
            ...currentSketch,
            points: [...currentSketch.points, snappedPoint]
          })
        } else if (tool === 'rectangle' && currentSketch.points.length > 0) {
          // For rectangle, update the end point
          const firstPoint = currentSketch.points[0]
          if (firstPoint) {
            setCurrentSketch({
              ...currentSketch,
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
  }, [isActive, isDrawing, currentSketch, camera, mouse, raycaster, tool, dimension, getSnappedPoint, setDocumentSketches, documentSketches]);

  return (
    <>
      {/* Drawing plane - only show when active */}
      {isActive && (
        <mesh
          ref={meshRef}
          position={planeConfig[dimension].position as unknown as THREE.Vector3}
          rotation={planeConfig[dimension].rotation as unknown as THREE.Euler}
          visible={true}
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
      )}

      {/* Render existing drawings - always visible */}
      {documentSketches[dimension].map((sketch) => (
        sketch.tool === 'pencil' ? (
          <Line
            key={sketch.id}
            points={getLinePoints(sketch.points, sketch.dimension)}
            color={sketch.color}
            lineWidth={3}
          />
        ) : sketch.tool === 'rectangle' && sketch.points.length >= 2 ? 
            renderRectangle(sketch) : null
      ))}

      {/* Render current drawing - only when active */}
      {isActive && currentSketch && (
        <>
          {currentSketch.tool === 'pencil' && currentSketch.points.length >= 2 && (
            <Line
              points={getLinePoints(currentSketch.points, dimension)}
              color="#ff0000"
              lineWidth={3}
            />
          )}
          {currentSketch.tool === 'rectangle' && currentSketch.points.length >= 2 && 
            currentSketch.points[0] && currentSketch.points[1] && (
            <Line
              points={getRectanglePoints(currentSketch.points[0], currentSketch.points[1], dimension)}
              color="#ff0000"
              lineWidth={3}
            />
          )}
        </>
      )}
    </>
  )
} 