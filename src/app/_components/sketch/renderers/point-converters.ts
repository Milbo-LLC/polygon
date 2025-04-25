import { useCallback } from 'react'
import { type Dimension } from '../../sketch-controls'
import { type Point3D } from '../types'
import { OFFSET_FROM_PLANE } from '../constants'

export function usePointConverters(dimension: Dimension) {
  // Convert points for line rendering based on dimension
  const convertPointsToLine = useCallback((points: Point3D[]): [number, number, number][] => {
    if (!points || points.length === 0) return []

    return points.map((p): [number, number, number] => {
      if (dimension === 'x') {
        return [OFFSET_FROM_PLANE, p.y, p.z]
      } else if (dimension === 'y') {
        return [p.x, OFFSET_FROM_PLANE, p.z]
      } else {
        return [p.x, p.y, OFFSET_FROM_PLANE]
      }
    })
  }, [dimension])

  // Get rectangle points from start and end
  const getRectanglePoints = useCallback((start: Point3D, end: Point3D): [number, number, number][] => {
    if (dimension === 'x') {
      return [
        [OFFSET_FROM_PLANE, start.y, start.z],
        [OFFSET_FROM_PLANE, start.y, end.z],
        [OFFSET_FROM_PLANE, end.y, end.z],
        [OFFSET_FROM_PLANE, end.y, start.z],
        [OFFSET_FROM_PLANE, start.y, start.z]
      ]
    } else if (dimension === 'y') {
      return [
        [start.x, OFFSET_FROM_PLANE, start.z],
        [end.x, OFFSET_FROM_PLANE, start.z],
        [end.x, OFFSET_FROM_PLANE, end.z],
        [start.x, OFFSET_FROM_PLANE, end.z],
        [start.x, OFFSET_FROM_PLANE, start.z]
      ]
    } else {
      return [
        [start.x, start.y, OFFSET_FROM_PLANE],
        [end.x, start.y, OFFSET_FROM_PLANE],
        [end.x, end.y, OFFSET_FROM_PLANE],
        [start.x, end.y, OFFSET_FROM_PLANE],
        [start.x, start.y, OFFSET_FROM_PLANE]
      ]
    }
  }, [dimension])

  return { convertPointsToLine, getRectanglePoints }
}