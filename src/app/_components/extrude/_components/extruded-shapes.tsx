import { useParams } from 'next/navigation'
import { useAtomValue } from 'jotai'
import { documentExtrudedShapesAtom, documentSketchesAtom, type ExtrudedShape, type DrawingItem } from '../../../(protected)/atoms'
import { type Dimension } from "~/types/modeling"
import * as THREE from 'three'
import { useMemo } from 'react'

export default function ExtrudedShapes() {
  const params = useParams()
  const documentId = params.documentId as string
  const extrudedShapes = useAtomValue(documentExtrudedShapesAtom(documentId))
  const documentSketches = useAtomValue(documentSketchesAtom(documentId))

  return (
    <>
      {extrudedShapes.map((shape) => (
        <ExtrudedShape key={shape.id} shape={shape} documentSketches={documentSketches} />
      ))}
    </>
  )
}

function ExtrudedShape({ shape, documentSketches }: { shape: ExtrudedShape, documentSketches: Record<Dimension, DrawingItem[]> }) {
  const sketch = useMemo(() => {
    return documentSketches[shape.dimension]?.find((s) => s.id === shape.sketchId)
  }, [documentSketches, shape.dimension, shape.sketchId])

  const geometry = useMemo(() => {
    if (!sketch || sketch.points.length < 2) return null

    try {
      // Create a shape from the sketch points
      const threeShape = new THREE.Shape()

      // For rectangle tool, use the rectangle points
      if (sketch.tool === 'rectangle' && sketch.points.length >= 2) {
        const start = sketch.points[0]
        const end = sketch.points[1]

        if (!start || !end) return null

        // Get 2D coordinates based on dimension
        let points2D: [number, number][] = []

        switch (shape.dimension) {
          case 'x':
            // YZ plane - use y and z
            points2D = [
              [start.y, start.z],
              [end.y, start.z],
              [end.y, end.z],
              [start.y, end.z]
            ]
            break
          case 'y':
            // XZ plane - use x and z
            points2D = [
              [start.x, start.z],
              [end.x, start.z],
              [end.x, end.z],
              [start.x, end.z]
            ]
            break
          case 'z':
            // XY plane - use x and y
            points2D = [
              [start.x, start.y],
              [end.x, start.y],
              [end.x, end.y],
              [start.x, end.y]
            ]
            break
        }

        threeShape.moveTo(points2D[0]![0], points2D[0]![1])
        for (let i = 1; i < points2D.length; i++) {
          threeShape.lineTo(points2D[i]![0], points2D[i]![1])
        }
        threeShape.closePath()
      } else if (sketch.tool === 'pencil') {
        // For pencil, try to create a closed shape
        let points2D: [number, number][] = []

        switch (shape.dimension) {
          case 'x':
            points2D = sketch.points.map((p) => [p.y, p.z] as [number, number])
            break
          case 'y':
            points2D = sketch.points.map((p) => [p.x, p.z] as [number, number])
            break
          case 'z':
            points2D = sketch.points.map((p) => [p.x, p.y] as [number, number])
            break
        }

        if (points2D.length >= 3) {
          threeShape.moveTo(points2D[0]![0], points2D[0]![1])
          for (let i = 1; i < points2D.length; i++) {
            threeShape.lineTo(points2D[i]![0], points2D[i]![1])
          }
          threeShape.closePath()
        }
      }

      const extrudeSettings = {
        depth: shape.depth,
        bevelEnabled: false
      }

      return new THREE.ExtrudeGeometry(threeShape, extrudeSettings)
    } catch (e) {
      console.error('Failed to create extrude geometry:', e)
      return null
    }
  }, [sketch, shape.depth, shape.dimension])

  if (!geometry || !sketch) return null

  // Calculate position and rotation based on dimension
  const position: [number, number, number] = [0, 0, 0]
  const rotation: [number, number, number] = [0, 0, 0]

  switch (shape.dimension) {
    case 'x':
      rotation[1] = Math.PI / 2
      break
    case 'y':
      rotation[0] = -Math.PI / 2
      break
    case 'z':
      // Default orientation
      break
  }

  return (
    <mesh position={position} rotation={rotation} geometry={geometry}>
      <meshStandardMaterial color={shape.color} side={THREE.DoubleSide} />
    </mesh>
  )
}
