import { useRef, useState, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { type Dimension, type Tool } from './sketch-controls'
import { type Point3D, type DrawingItem } from '../../../(protected)/atoms'
import { useParams } from 'next/navigation'
import { DEFAULT_LINE_COLOR } from '../config/constants'
import useDocumentSketches from '~/app/_components/sketch/hooks/use-document-sketches'
import useGridSnapping from '~/app/_components/sketch/hooks/use-grid-snapping'
import { PLANE_CONFIG } from '../config/plane-config'
import { ToolRenderers } from '../renderers/tools-renderers'
import { useToolHandler } from '../hooks/use-tool-handler'
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
}: SketchPlaneProps) {
  // Hooks and state
  const params = useParams()
  const documentId = params.documentId as string
  const { sketches, addSketch, undoLastSketch } = useDocumentSketches(documentId, dimension)
  const meshRef = useRef<THREE.Mesh>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentSketch, setCurrentSketch] = useState<DrawingItem | null>(null)
  const { raycaster, pointer, camera } = useThree()
  const snapToGrid = useGridSnapping(gridSize, gridDivisions)
  
  // Get snapped point from intersection
  const getSnappedPoint = useCallback((intersection: THREE.Intersection): Point3D | null => {
    if (!intersection?.point) return null
    return snapToGrid(intersection.point)
  }, [snapToGrid])
  
  // Event handlers
  const handleClick = useCallback(() => {
    if (!isActive || !meshRef.current) return
    
    raycaster.setFromCamera(pointer, camera)
    const intersects = raycaster.intersectObject(meshRef.current)
    
    if (intersects.length > 0 && intersects[0]) {
      // If already drawing, finish the drawing
      if (isDrawing && currentSketch) {
        if (currentSketch.points.length >= 2) {
          addSketch(currentSketch)
        }
        setIsDrawing(false)
        setCurrentSketch(null)
        return
      }
      
      // Start a new drawing
      const snappedPoint = getSnappedPoint(intersects[0])
      if (!snappedPoint) return
      
      setIsDrawing(true)
      setCurrentSketch({
        id: Date.now().toString(),
        tool,
        color: DEFAULT_LINE_COLOR,
        points: [snappedPoint],
        dimension
      })
    }
  }, [
    isActive, raycaster, pointer, camera, isDrawing, currentSketch, 
    addSketch, getSnappedPoint, tool, dimension
  ])
  
  // Handle keyboard events
  useEffect(() => {
    if (!isActive) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && isDrawing) {
        setIsDrawing(false)
        setCurrentSketch(null)
      } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        undoLastSketch()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, isDrawing, undoLastSketch])
  
  // Handle pointer movement
  useEffect(() => {
    if (!isActive || !isDrawing || !currentSketch || !meshRef.current) return
    
    const handlePointerMove = () => {
      raycaster.setFromCamera(pointer, camera)
      const intersects = raycaster.intersectObject(meshRef.current!)
      
      if (intersects.length > 0 && intersects[0]) {
        const snappedPoint = getSnappedPoint(intersects[0])
        if (!snappedPoint) return
        
        // Use the appropriate tool handler
        const updateHandler = useToolHandler[tool]
        if (updateHandler) {
          setCurrentSketch(updateHandler(currentSketch, snappedPoint))
        }
      }
    }
    
    window.addEventListener('pointermove', handlePointerMove)
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [
    isActive, isDrawing, currentSketch, meshRef, raycaster, pointer, 
    camera, getSnappedPoint, tool
  ])
  
  // Rendering
  const activePlaneProps = {
    ref: meshRef,
    position: PLANE_CONFIG[dimension].position as unknown as THREE.Vector3,
    rotation: PLANE_CONFIG[dimension].rotation as unknown as THREE.Euler,
    visible: true,
    onClick: handleClick
  }
  
  return (
    <>
      {isActive && (
        <mesh {...activePlaneProps}>
          <planeGeometry args={[gridSize, gridSize]} />
          <meshBasicMaterial 
            color={PLANE_CONFIG[dimension].color}
            transparent
            opacity={isDrawing ? 0.2 : 0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {sketches.map(sketch => {
        const ToolRenderer = ToolRenderers[sketch.tool]
        return ToolRenderer ? ToolRenderer(sketch) : null
      })}

      {isActive && currentSketch && currentSketch.points.length >= 2 && (
        ToolRenderers[currentSketch.tool]?.(currentSketch, true)
      )}
    </>
  )
} 