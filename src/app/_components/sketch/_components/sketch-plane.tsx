import { useRef, useState, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { type Dimension, type Tool } from "~/types/modeling"
import { type Point3D, type DrawingItem } from '../../../(protected)/atoms'
import { useParams } from 'next/navigation'
import { DEFAULT_LINE_COLOR } from '../config/constants'
import useDocumentSketches from '~/app/_components/sketch/hooks/use-document-sketches'
import useAddHistory from '~/app/_components/history/use-add-history'
import useGridSnapping from '~/app/_components/sketch/hooks/use-grid-snapping'
import { PLANE_CONFIG } from '../config/plane-config'
import { ToolRenderers } from '../renderers/tools-renderers'
import { useToolHandler } from '../hooks/use-tool-handler'
import { useAtom } from 'jotai'
import { sketchStateAtom } from '../../../(protected)/atoms'
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
  const { addHistoryStep } = useAddHistory(documentId)
  const { sketches, addSketch, undoLastSketch, deleteSketch, clearAllSketches } = useDocumentSketches(
    documentId,
    dimension,
    addHistoryStep
  )
  const meshRef = useRef<THREE.Mesh>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentSketch, setCurrentSketch] = useState<DrawingItem | null>(null)
  const { raycaster, pointer, camera } = useThree()
  const snapToGrid = useGridSnapping(gridSize, gridDivisions)
  const [sketchState, setSketchState] = useAtom(sketchStateAtom)
  
  // Get snapped point from intersection
  const getSnappedPoint = useCallback((intersection: THREE.Intersection): Point3D | null => {
    if (!intersection?.point) return null
    return snapToGrid(intersection.point)
  }, [snapToGrid])

  // Helper to find sketch near a point
  const findSketchNearPoint = useCallback((point: Point3D, threshold = 2): DrawingItem | null => {
    for (const sketch of sketches) {
      for (const sketchPoint of sketch.points) {
        const distance = Math.sqrt(
          Math.pow(sketchPoint.x - point.x, 2) +
          Math.pow(sketchPoint.y - point.y, 2) +
          Math.pow(sketchPoint.z - point.z, 2)
        )
        if (distance < threshold) {
          return sketch
        }
      }
    }
    return null
  }, [sketches])

  // Event handlers
  const handleClick = useCallback(() => {
    if (!isActive || !meshRef.current) return

    raycaster.setFromCamera(pointer, camera)
    const intersects = raycaster.intersectObject(meshRef.current)

    if (intersects.length > 0 && intersects[0]) {
      const snappedPoint = getSnappedPoint(intersects[0])
      if (!snappedPoint) return

      // Handle eraser tool
      if (tool === 'eraser') {
        const sketchToDelete = findSketchNearPoint(snappedPoint)
        if (sketchToDelete) {
          deleteSketch(sketchToDelete.id)
        }
        return
      }

      // Handle select tool
      if (tool === 'select') {
        const sketchToSelect = findSketchNearPoint(snappedPoint)
        if (sketchToSelect) {
          setSketchState({
            ...sketchState,
            selectedSketchId: sketchToSelect.id
          })
        } else {
          setSketchState({
            ...sketchState,
            selectedSketchId: null
          })
        }
        return
      }

      // Handle drawing tools (pencil, rectangle)
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
    addSketch, getSnappedPoint, tool, dimension, deleteSketch, findSketchNearPoint,
    sketchState, setSketchState
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
      } else if ((e.code === 'Delete' || e.code === 'Backspace') && sketchState.selectedSketchId) {
        e.preventDefault()
        deleteSketch(sketchState.selectedSketchId)
        setSketchState({
          ...sketchState,
          selectedSketchId: null
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, isDrawing, undoLastSketch, sketchState, setSketchState, deleteSketch])

  // Handle clear all event
  useEffect(() => {
    const handleClearAll = () => {
      clearAllSketches()
    }

    window.addEventListener('clearSketches', handleClearAll)
    return () => window.removeEventListener('clearSketches', handleClearAll)
  }, [clearAllSketches])
  
  // Handle pointer movement
  useEffect(() => {
    // Don't track pointer movement for eraser or select tools
    if (!isActive || !isDrawing || !currentSketch || !meshRef.current || tool === 'eraser' || tool === 'select') return

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
        const isSelected = sketchState.selectedSketchId === sketch.id
        return ToolRenderer ? ToolRenderer(sketch, false, isSelected) : null
      })}

      {isActive && currentSketch && currentSketch.points.length >= 2 && (
        ToolRenderers[currentSketch.tool]?.(currentSketch, true)
      )}
    </>
  )
} 