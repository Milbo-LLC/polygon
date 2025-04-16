import { PLANE_CONFIG } from "../config/plane-config"
import { type DrawingItem } from "~/app/(protected)/atoms"
import { Line } from "@react-three/drei"
import { DEFAULT_LINE_WIDTH, ACTIVE_LINE_COLOR } from "../config/constants"


export const ToolRenderers = {
  pencil: ({ points, color, id, dimension }: DrawingItem, isActive = false) => {
    const { transformPoint } = PLANE_CONFIG[dimension]
    const transformedPoints = points.map(transformPoint)

    if (transformedPoints.length < 2) return null

    return (
      <Line
        key={id}
        points={transformedPoints}
        color={isActive ? ACTIVE_LINE_COLOR : color}
        lineWidth={DEFAULT_LINE_WIDTH}
      />
    )
  },
  rectangle: ({ points, color, id, dimension }: DrawingItem, isActive = false) => {
    if (points.length < 2) return null
    const [start, end] = points
    if (!start || !end) return null

    return (
      <Line
        key={id}
        points={PLANE_CONFIG[dimension].getRectPoints(start, end)}
        color={isActive ? ACTIVE_LINE_COLOR : color}
        lineWidth={DEFAULT_LINE_WIDTH}
      />
    )
  }
}