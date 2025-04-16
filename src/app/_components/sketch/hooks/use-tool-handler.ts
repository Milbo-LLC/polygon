import { type DrawingItem, type Point3D } from "~/app/(protected)/atoms"

export const useToolHandler = {
  pencil: (currentSketch: DrawingItem, snappedPoint: Point3D) => ({
    ...currentSketch,
    points: [...currentSketch.points, snappedPoint]
  }),
  rectangle: (currentSketch: DrawingItem, snappedPoint: Point3D) => {
    const firstPoint = currentSketch.points[0]
    if (!firstPoint) return currentSketch
    return {
      ...currentSketch,
      points: [firstPoint, snappedPoint]
    }
  }
}