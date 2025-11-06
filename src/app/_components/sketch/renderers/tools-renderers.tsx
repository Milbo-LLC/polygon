import { PLANE_CONFIG } from "../config/plane-config"
import { type DrawingItem } from "~/app/(protected)/atoms"
import { Line } from "@react-three/drei"
import { DEFAULT_LINE_WIDTH, ACTIVE_LINE_COLOR } from "../config/constants"

const SELECTED_LINE_COLOR = '#ffff00' // Yellow for selected

export const ToolRenderers = {
  pencil: ({ points, color, id, dimension }: DrawingItem, isActive = false, isSelected = false) => {
    const { transformPoint } = PLANE_CONFIG[dimension]
    const transformedPoints = points.map(transformPoint)

    if (transformedPoints.length < 2) return null

    const lineColor = isSelected ? SELECTED_LINE_COLOR : (isActive ? ACTIVE_LINE_COLOR : color)

    return (
      <Line
        key={id}
        points={transformedPoints}
        color={lineColor}
        lineWidth={isSelected ? DEFAULT_LINE_WIDTH * 1.5 : DEFAULT_LINE_WIDTH}
      />
    )
  },
  rectangle: ({ points, color, id, dimension }: DrawingItem, isActive = false, isSelected = false) => {
    if (points.length < 2) return null
    const [start, end] = points
    if (!start || !end) return null

    const lineColor = isSelected ? SELECTED_LINE_COLOR : (isActive ? ACTIVE_LINE_COLOR : color)

    return (
      <Line
        key={id}
        points={PLANE_CONFIG[dimension].getRectPoints(start, end)}
        color={lineColor}
        lineWidth={isSelected ? DEFAULT_LINE_WIDTH * 1.5 : DEFAULT_LINE_WIDTH}
      />
    )
  },
  eraser: () => null, // Eraser doesn't render anything
  select: () => null  // Select doesn't render anything
}