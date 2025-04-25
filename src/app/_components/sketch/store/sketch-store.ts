import { type Dimension } from '../../sketch-controls'
import { type SketchItem } from '../types'

// Global store to keep sketches across component rerenders
export const globalSketchStore: Record<Dimension, SketchItem[]> = {
  x: [],
  y: [],
  z: []
}