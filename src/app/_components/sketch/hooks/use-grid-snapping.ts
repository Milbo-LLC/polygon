import { useCallback } from "react"
import { type Point3D } from "~/app/(protected)/atoms"
import type * as THREE from 'three'

export default function useGridSnapping(gridSize: number, gridDivisions: number) {
  return useCallback((point: THREE.Vector3): Point3D => {
    const cellSize = gridSize / gridDivisions
    return {
      x: Math.round(point.x / cellSize) * cellSize,
      y: Math.round(point.y / cellSize) * cellSize,
      z: Math.round(point.z / cellSize) * cellSize
    }
  }, [gridSize, gridDivisions])
}