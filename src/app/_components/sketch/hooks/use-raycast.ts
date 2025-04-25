import { useCallback } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { type Point3D } from '../types'

export function useRaycast(
  meshRef: React.RefObject<THREE.Mesh>,
  snapToGrid: (value: number) => number
) {
  const { raycaster, mouse, camera } = useThree()

  const getIntersectionPoint = useCallback((): THREE.Intersection | null => {
    if (!meshRef.current) return null

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObject(meshRef.current)

    return intersects.length > 0 ? intersects[0] as THREE.Intersection : null
  }, [raycaster, mouse, camera, meshRef])

  const getSnappedPoint = useCallback((intersection: THREE.Intersection): Point3D | null => {
    if (!intersection?.point) return null

    const point = intersection.point

    return {
      x: snapToGrid(point.x),
      y: snapToGrid(point.y),
      z: snapToGrid(point.z)
    }
  }, [snapToGrid])

  return { getIntersectionPoint, getSnappedPoint }
}