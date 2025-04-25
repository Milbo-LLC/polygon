import { type Dimension, type Tool } from '../sketch-controls'

export interface Point3D {
  x: number
  y: number
  z: number
}

export interface SketchItem {
  id: string
  tool: Tool
  color: string
  points: Point3D[]
  dimension: Dimension
}

export interface SketchPlaneProps {
  dimension: Dimension
  tool: Tool
  isActive: boolean
  gridSize: number
  gridDivisions: number
  persistDrawings?: boolean
}