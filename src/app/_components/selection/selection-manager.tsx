'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useThree } from '@react-three/fiber'
import { useParams } from 'next/navigation'
import { useAtom, useAtomValue } from 'jotai'
import * as THREE from 'three'
import { documentSelectionAtom } from '~/app/(protected)/atoms/selection-atoms'
import { documentSketchesFromOperationsAtom } from '~/app/(protected)/atoms/operations-atoms'
import { sketchStateAtom } from '~/app/(protected)/atoms'
import { SpatialIndex } from '~/lib/selection/spatial-index'
import { performRaycast, createDimensionPlanes } from '~/lib/selection/raycaster'

export default function SelectionManager() {
  const params = useParams()
  const documentId = params.documentId as string
  const { raycaster, pointer, camera, gl, scene } = useThree()

  const [selectionState, setSelectionState] = useAtom(documentSelectionAtom(documentId))
  const sketches = useAtomValue(documentSketchesFromOperationsAtom(documentId))
  const sketchState = useAtomValue(sketchStateAtom)

  const spatialIndexRef = useRef(new SpatialIndex())
  const dimensionPlanesRef = useRef<ReturnType<typeof createDimensionPlanes> | null>(null)
  const shiftKeyRef = useRef(false)

  // ========================================================================
  // SPATIAL INDEX UPDATES (instead of creating thousands of meshes)
  // ========================================================================

  // Update spatial index when sketches change
  useEffect(() => {
    spatialIndexRef.current.indexSketches(sketches)
  }, [sketches])

  // Create dimension planes once (only 3 meshes total, not thousands!)
  useEffect(() => {
    if (!dimensionPlanesRef.current) {
      dimensionPlanesRef.current = createDimensionPlanes(100)

      // Add planes to scene
      Object.values(dimensionPlanesRef.current).forEach(plane => {
        scene.add(plane)
      })
    }

    return () => {
      // Cleanup on unmount
      if (dimensionPlanesRef.current) {
        Object.values(dimensionPlanesRef.current).forEach(plane => {
          scene.remove(plane)
          plane.geometry.dispose()
          if (Array.isArray(plane.material)) {
            plane.material.forEach(m => m.dispose())
          } else {
            (plane.material as THREE.Material).dispose()
          }
        })
      }
    }
  }, [scene])

  // ========================================================================
  // KEYBOARD HANDLERS
  // ========================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift key for multi-select
      if (e.key === 'Shift') {
        shiftKeyRef.current = true
        setSelectionState(prev => ({ ...prev, isMultiSelectMode: true }))
      }

      // ESC to deselect all
      if (e.key === 'Escape') {
        setSelectionState(prev => ({
          ...prev,
          selectedElements: [],
          hoveredElement: null,
        }))
      }

      // Delete selected elements
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectionState.selectedElements.length > 0) {
          e.preventDefault()
          // TODO: Implement delete logic (call operations API)
          console.log('Delete selected:', selectionState.selectedElements)
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftKeyRef.current = false
        setSelectionState(prev => ({ ...prev, isMultiSelectMode: false }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [setSelectionState, selectionState.selectedElements])

  // ========================================================================
  // HOVER HANDLING (using spatial index)
  // ========================================================================

  useEffect(() => {
    const handlePointerMove = () => {
      if (!dimensionPlanesRef.current) return

      raycaster.setFromCamera(pointer, camera)
      const result = performRaycast(
        raycaster,
        dimensionPlanesRef.current,
        spatialIndexRef.current,
        sketchState.dimension
      )

      if (result) {
        setSelectionState(prev => ({
          ...prev,
          hoveredElement: result.element,
        }))
        gl.domElement.style.cursor = 'pointer'
      } else {
        setSelectionState(prev => ({
          ...prev,
          hoveredElement: null,
        }))
        gl.domElement.style.cursor = 'default'
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      gl.domElement.style.cursor = 'default'
    }
  }, [raycaster, pointer, camera, gl, setSelectionState, sketchState.dimension])

  // ========================================================================
  // CLICK HANDLING (using spatial index)
  // ========================================================================

  const handleClick = useCallback(() => {
    if (!dimensionPlanesRef.current) return

    raycaster.setFromCamera(pointer, camera)
    const result = performRaycast(
      raycaster,
      dimensionPlanesRef.current,
      spatialIndexRef.current,
      sketchState.dimension
    )

    if (result) {
      // Multi-select mode (Shift held)
      if (shiftKeyRef.current) {
        setSelectionState(prev => {
          const alreadySelected = prev.selectedElements.some(el => el.id === result.element.id)
          if (alreadySelected) {
            // Deselect
            return {
              ...prev,
              selectedElements: prev.selectedElements.filter(el => el.id !== result.element.id),
            }
          } else {
            // Add to selection
            return {
              ...prev,
              selectedElements: [...prev.selectedElements, result.element],
            }
          }
        })
      } else {
        // Single select mode
        setSelectionState(prev => ({
          ...prev,
          selectedElements: [result.element],
        }))
      }
    } else {
      // Clicked empty space - deselect all
      setSelectionState(prev => ({
        ...prev,
        selectedElements: [],
      }))
    }
  }, [raycaster, pointer, camera, setSelectionState, sketchState.dimension])

  useEffect(() => {
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [handleClick])

  // This component doesn't render anything visible
  return null
}
