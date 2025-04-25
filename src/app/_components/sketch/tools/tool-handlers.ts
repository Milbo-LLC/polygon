import { useMemo } from 'react'
import { type Dimension } from '../../sketch-controls'
import { type Point3D, type SketchItem } from '../types'
import { usePointConverters } from '../rendering/point-converters'

export interface ToolHandler {
  handleMove: (currentSketch: SketchItem, newPoint: Point3D) => SketchItem
  getPoints: (sketch: SketchItem) => [number, number, number][]
}

export type ToolHandlers = {
  [key: string]: ToolHandler
}

export function useToolHandlers(dimension: Dimension) {
  const { convertPointsToLine, getRectanglePoints } = usePointConverters(dimension)

  return useMemo<ToolHandlers>(() => ({
    pencil: {
      handleMove: (currentSketch, newPoint) => ({
        ...currentSketch,
        points: [...currentSketch.points, newPoint]
      }),
      getPoints: (sketch) => convertPointsToLine(sketch.points)
    },
    rectangle: {
      handleMove: (currentSketch, newPoint) => {
        const firstPoint = currentSketch.points[0]
        if (!firstPoint) return currentSketch

        return {
          ...currentSketch,
          points: [firstPoint, newPoint]
        }
      },
      getPoints: (sketch) => {
        if (sketch.points.length < 2) return []

        const [start, end] = sketch.points
        if (!start || !end) return []

        return getRectanglePoints(start, end)
      }
    }
  }), [convertPointsToLine, getRectanglePoints])
}