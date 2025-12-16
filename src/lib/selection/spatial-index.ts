import RBush from 'rbush'
import type { Point3D } from '~/app/(protected)/atoms'
import type { SelectableElement, SelectableElementType } from '~/app/(protected)/atoms/selection-atoms'
import type { DrawingItem } from '~/app/(protected)/atoms'

// ============================================================================
// SPATIAL INDEX (R-tree for O(log n) lookups)
// ============================================================================

interface IndexedElement {
  minX: number
  minY: number
  maxX: number
  maxY: number
  element: SelectableElement
}

export class SpatialIndex {
  private tree = new RBush<IndexedElement>()

  /**
   * Index all elements from sketches
   */
  indexSketches(sketches: Record<'x' | 'y' | 'z', DrawingItem[]>) {
    this.tree.clear()

    for (const dimension of ['x', 'y', 'z'] as const) {
      for (const sketch of sketches[dimension]) {
        // Index the entire sketch
        const sketchBounds = this.calculateSketchBounds(sketch)
        this.tree.insert({
          ...sketchBounds,
          element: {
            type: 'sketch',
            id: sketch.id,
            geometry: { points: sketch.points }
          }
        })

        // Index individual points
        sketch.points.forEach((point, index) => {
          const padding = 3 // Selection radius
          this.tree.insert({
            minX: point.x - padding,
            minY: point.y - padding,
            maxX: point.x + padding,
            maxY: point.y + padding,
            element: {
              type: 'point',
              id: `${sketch.id}-point-${index}`,
              parentId: sketch.id,
              geometry: { position: point }
            }
          })
        })

        // Index individual lines
        for (let i = 0; i < sketch.points.length - 1; i++) {
          const start = sketch.points[i]!
          const end = sketch.points[i + 1]!
          const padding = 2

          this.tree.insert({
            minX: Math.min(start.x, end.x) - padding,
            minY: Math.min(start.y, end.y) - padding,
            maxX: Math.max(start.x, end.x) + padding,
            maxY: Math.max(start.y, end.y) + padding,
            element: {
              type: 'line',
              id: `${sketch.id}-line-${i}`,
              parentId: sketch.id,
              geometry: { points: [start, end] }
            }
          })
        }
      }
    }
  }

  /**
   * Find elements near a 2D point (O(log n) instead of O(n))
   */
  findNear(x: number, y: number, radius: number): SelectableElement[] {
    const candidates = this.tree.search({
      minX: x - radius,
      minY: y - radius,
      maxX: x + radius,
      maxY: y + radius,
    })

    // Filter by actual distance and sort by type priority (points > lines > sketches)
    return candidates
      .map(c => ({
        element: c.element,
        distance: this.distanceToElement(c.element, x, y)
      }))
      .filter(({ distance }) => distance < radius)
      .sort((a, b) => {
        // Priority: points > lines > sketches
        const typePriority = { point: 0, line: 1, sketch: 2, edge: 3, face: 4 }
        const priorityDiff = typePriority[a.element.type] - typePriority[b.element.type]
        if (priorityDiff !== 0) return priorityDiff
        // If same type, sort by distance
        return a.distance - b.distance
      })
      .map(({ element }) => element)
  }

  private calculateSketchBounds(sketch: DrawingItem): { minX: number, minY: number, maxX: number, maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    for (const point of sketch.points) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }

    return { minX, minY, maxX, maxY }
  }

  private distanceToElement(element: SelectableElement, x: number, y: number): number {
    if (element.type === 'point' && element.geometry?.position) {
      const p = element.geometry.position
      return Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2)
    }

    if (element.type === 'line' && element.geometry?.points) {
      const [start, end] = element.geometry.points
      if (!start || !end) return Infinity
      return this.distanceToLineSegment(x, y, start, end)
    }

    if (element.type === 'sketch' && element.geometry?.points) {
      // Distance to closest point or line in sketch
      let minDist = Infinity
      for (const point of element.geometry.points) {
        const dist = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2)
        minDist = Math.min(minDist, dist)
      }
      return minDist
    }

    return Infinity
  }

  private distanceToLineSegment(px: number, py: number, start: Point3D, end: Point3D): number {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const lengthSquared = dx * dx + dy * dy

    if (lengthSquared === 0) {
      return Math.sqrt((px - start.x) ** 2 + (py - start.y) ** 2)
    }

    let t = ((px - start.x) * dx + (py - start.y) * dy) / lengthSquared
    t = Math.max(0, Math.min(1, t))

    const projX = start.x + t * dx
    const projY = start.y + t * dy

    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2)
  }
}
