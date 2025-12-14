import { useRef, useEffect, useCallback } from 'react'
import type * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useParams } from 'next/navigation'
import { useAtom, useAtomValue } from 'jotai'
import { extrudeStateAtom, documentSketchesAtom, sketchStateAtom, type Point3D } from '../../../(protected)/atoms'
import { type Dimension } from '../../sketch/_components/sketch-controls'

interface ExtrudeHandlerProps {
  isActive: boolean
}

export default function ExtrudeHandler({ isActive }: ExtrudeHandlerProps) {
  const params = useParams()
  const documentId = params.documentId as string
  const documentSketches = useAtomValue(documentSketchesAtom(documentId))
  const [extrudeState, setExtrudeState] = useAtom(extrudeStateAtom)
  const [sketchState, setSketchState] = useAtom(sketchStateAtom)
  const { raycaster, pointer, camera } = useThree()
  const meshRefs = useRef<Record<string, THREE.Mesh>>({})

  // Helper to find sketch near a point
  const findSketchNearPoint = useCallback((point: Point3D, threshold = 2): { sketchId: string, dimension: Dimension } | null => {
    for (const dim of ['x', 'y', 'z'] as const) {
      for (const sketch of documentSketches[dim]) {
        for (const sketchPoint of sketch.points) {
          const distance = Math.sqrt(
            Math.pow(sketchPoint.x - point.x, 2) +
            Math.pow(sketchPoint.y - point.y, 2) +
            Math.pow(sketchPoint.z - point.z, 2)
          )
          if (distance < threshold) {
            return { sketchId: sketch.id, dimension: dim }
          }
        }
      }
    }
    return null
  }, [documentSketches])

  // Handle clicks to select sketches
  useEffect(() => {
    if (!isActive) return

    const handleClick = () => {
      // Cast all mesh objects for raycasting
      const meshArray = Object.values(meshRefs.current)
      if (meshArray.length === 0) return

      raycaster.setFromCamera(pointer, camera)
      const intersects = raycaster.intersectObjects(meshArray)

      if (intersects.length > 0 && intersects[0]) {
        const point = intersects[0].point
        const found = findSketchNearPoint(point)

        if (found) {
          // Update both extrude state and sketch state for visual highlighting
          setExtrudeState({
            ...extrudeState,
            selectedSketchId: found.sketchId
          })
          setSketchState({
            ...sketchState,
            selectedSketchId: found.sketchId
          })
        }
      } else {
        // Deselect if clicking empty space
        setExtrudeState({
          ...extrudeState,
          selectedSketchId: null
        })
        setSketchState({
          ...sketchState,
          selectedSketchId: null
        })
      }
    }

    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [isActive, raycaster, pointer, camera, findSketchNearPoint, extrudeState, setExtrudeState, sketchState, setSketchState])

  // Render invisible planes for all three dimensions to catch clicks
  return (
    <>
      {isActive && (
        <>
          {/* X plane */}
          <mesh
            ref={(ref) => {
              if (ref) meshRefs.current.x = ref
            }}
            position={[0, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <planeGeometry args={[100, 100]} />
            <meshBasicMaterial visible={false} />
          </mesh>
          {/* Y plane */}
          <mesh
            ref={(ref) => {
              if (ref) meshRefs.current.y = ref
            }}
            position={[0, 0, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[100, 100]} />
            <meshBasicMaterial visible={false} />
          </mesh>
          {/* Z plane */}
          <mesh
            ref={(ref) => {
              if (ref) meshRefs.current.z = ref
            }}
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
          >
            <planeGeometry args={[100, 100]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        </>
      )}
    </>
  )
}
