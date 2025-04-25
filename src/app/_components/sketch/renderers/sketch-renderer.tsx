import { useCallback } from 'react'
import { Line } from '@react-three/drei'
import { type SketchItem } from '../types'
import { ACTIVE_SKETCH_COLOR, DEFAULT_LINE_WIDTH } from '../constants'
import { type ToolHandlers } from '../tools/tool-handlers'

export function useSketchRenderer(toolHandlers: ToolHandlers) {
  return useCallback((sketch: SketchItem, isActive = false) => {
    const handler = toolHandlers[sketch.tool]
    if (!handler || sketch.points.length < 2) return null

    const points = handler.getPoints(sketch)
    if (points.length === 0) return null

    return (
      <Line
        key={sketch.id}
        points={points}
        color={isActive ? ACTIVE_SKETCH_COLOR : sketch.color}
        lineWidth={DEFAULT_LINE_WIDTH}
      />
    )
  }, [toolHandlers])
}