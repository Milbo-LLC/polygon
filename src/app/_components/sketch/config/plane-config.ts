import { type Point3D } from '../../../(protected)/atoms'
import { PLANE_OFFSET } from './constants'

// Plane-specific configuration
export const PLANE_CONFIG = {
  x: {
    position: [0, 0, 0],
    rotation: [0, Math.PI / 2, 0],
    color: '#ff7b7b',
    transformPoint: (p: Point3D): [number, number, number] => [PLANE_OFFSET, p.y, p.z],
    getRectPoints: (start: Point3D, end: Point3D): [number, number, number][] => [
      [PLANE_OFFSET, start.y, start.z],
      [PLANE_OFFSET, start.y, end.z],
      [PLANE_OFFSET, end.y, end.z],
      [PLANE_OFFSET, end.y, start.z], 
      [PLANE_OFFSET, start.y, start.z]
    ]
  },
  y: {
    position: [0, 0, 0],
    rotation: [Math.PI / 2, 0, 0],
    color: '#7bff7b',
    transformPoint: (p: Point3D): [number, number, number] => [p.x, PLANE_OFFSET, p.z],
    getRectPoints: (start: Point3D, end: Point3D): [number, number, number][] => [
      [start.x, PLANE_OFFSET, start.z],
      [end.x, PLANE_OFFSET, start.z],
      [end.x, PLANE_OFFSET, end.z],
      [start.x, PLANE_OFFSET, end.z],
      [start.x, PLANE_OFFSET, start.z]
    ]
  },
  z: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    color: '#7b7bff',
    transformPoint: (p: Point3D): [number, number, number] => [p.x, p.y, PLANE_OFFSET],
    getRectPoints: (start: Point3D, end: Point3D): [number, number, number][] => [
      [start.x, start.y, PLANE_OFFSET],
      [end.x, start.y, PLANE_OFFSET],
      [end.x, end.y, PLANE_OFFSET],
      [start.x, end.y, PLANE_OFFSET],
      [start.x, start.y, PLANE_OFFSET]
    ]
  }
} 