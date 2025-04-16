import { type Dimension, type Tool } from './sketch-controls'

export interface Point3D {
  x: number
  y: number
  z: number
}

export interface DrawingItem {
  id: string
  tool: Tool
  color: string
  points: Point3D[]
  dimension: Dimension // Track which dimension this drawing belongs to
}

// Global store to keep drawings across component rerenders
export const globalDrawings: Record<Dimension, DrawingItem[]> = {
  x: [],
  y: [],
  z: []
}; 