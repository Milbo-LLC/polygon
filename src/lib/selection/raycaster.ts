import * as THREE from 'three'
import { SpatialIndex } from './spatial-index'
import type { SelectableElement } from '~/app/(protected)/atoms/selection-atoms'
import type { Dimension } from '~/app/(protected)/atoms'

export interface RaycastResult {
  element: SelectableElement
  distance: number
  point: THREE.Vector3
}

/**
 * Perform raycasting by hitting dimension plane, then using spatial index
 * Much more efficient than raycasting against thousands of meshes
 */
export function performRaycast(
  raycaster: THREE.Raycaster,
  dimensionPlanes: Record<Dimension, THREE.Mesh>,
  spatialIndex: SpatialIndex,
  currentDimension: Dimension | null
): RaycastResult | null {
  // If on a specific dimension plane, raycast against it
  const planesToCheck = currentDimension
    ? [dimensionPlanes[currentDimension]].filter((p): p is THREE.Mesh => p !== undefined)
    : Object.values(dimensionPlanes)

  const intersects = raycaster.intersectObjects(planesToCheck)

  if (intersects.length === 0) return null

  const hit = intersects[0]!
  const hitPoint = hit.point

  // Convert 3D hit point to 2D coordinates on the plane
  // (Implementation depends on dimension - for now simplified)
  const x = hitPoint.x
  const y = hitPoint.y

  // Use spatial index to find nearby elements (O(log n))
  const nearbyElements = spatialIndex.findNear(x, y, 10)

  if (nearbyElements.length === 0) return null

  // Return closest element
  return {
    element: nearbyElements[0]!,
    distance: hit.distance,
    point: hitPoint,
  }
}

/**
 * Create dimension planes for raycasting (one per dimension)
 */
export function createDimensionPlanes(gridSize: number): Record<Dimension, THREE.Mesh> {
  const planes: Record<Dimension, THREE.Mesh> = {} as any

  // X plane (YZ plane at x=0)
  const xPlaneGeometry = new THREE.PlaneGeometry(gridSize, gridSize)
  const xPlaneMesh = new THREE.Mesh(
    xPlaneGeometry,
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
  )
  xPlaneMesh.rotation.y = Math.PI / 2
  planes.x = xPlaneMesh

  // Y plane (XZ plane at y=0)
  const yPlaneGeometry = new THREE.PlaneGeometry(gridSize, gridSize)
  const yPlaneMesh = new THREE.Mesh(
    yPlaneGeometry,
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
  )
  yPlaneMesh.rotation.x = Math.PI / 2
  planes.y = yPlaneMesh

  // Z plane (XY plane at z=0)
  const zPlaneGeometry = new THREE.PlaneGeometry(gridSize, gridSize)
  const zPlaneMesh = new THREE.Mesh(
    zPlaneGeometry,
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
  )
  planes.z = zPlaneMesh

  return planes
}
