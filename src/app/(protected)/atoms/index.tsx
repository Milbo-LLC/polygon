import { atom } from "jotai";
import { atomFamily, atomWithStorage } from "jotai/utils";
import { type Tool, type Dimension } from "~/app/_components/sketch/_components/sketch-controls";

// Re-export types for convenience
export type { Tool, Dimension };

export const sidebarCollapsedAtom = atomWithStorage<boolean>("polygon:sidebar:collapsed", false);

// Theme options: 'light', 'dark', or 'system'
export type ThemeMode = 'light' | 'dark' | 'system';

// Create atom that persists in localStorage with key 'theme'
export const themeAtom = atomWithStorage<ThemeMode>('theme', 'system');

export type CanvasTool = 'sketch' | 'extrude'

export type CanvasState = {
  selectedTool: CanvasTool | null
}

export const canvasStateAtom = atomWithStorage<CanvasState>('canvasState', {
  selectedTool: null,
});

export type SketchTool = 'pencil' | 'rectangle' | 'eraser' | 'select'

export type SketchState = {
  selectedTool: SketchTool
  dimension: Dimension | null
  selectedSketchId: string | null
}

export const sketchStateAtom = atom<SketchState>({
  selectedTool: 'pencil',
  dimension: null,
  selectedSketchId: null,
})

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

export const documentSketchesAtom = atomFamily((documentId: string) => atomWithStorage<Record<Dimension, DrawingItem[]>>(`polygon:sketch:document-${documentId}`, {
  x: [],
  y: [],
  z: []
}))

export interface ExtrudedShape {
  id: string
  sketchId: string
  dimension: Dimension
  depth: number
  color: string
}

export const documentExtrudedShapesAtom = atomFamily((documentId: string) => atomWithStorage<ExtrudedShape[]>(`polygon:extrude:document-${documentId}`, []))

export type ExtrudeState = {
  selectedSketchId: string | null
  hoveredSketchId: string | null
  depth: number
}

export const extrudeStateAtom = atom<ExtrudeState>({
  selectedSketchId: null,
  hoveredSketchId: null,
  depth: 10,
})

// History types
export type HistoryActionType =
  | 'create_sketch'
  | 'delete_sketch'
  | 'clear_sketches'
  | 'extrude'
  | 'undo_sketch'

export interface HistoryAction {
  type: HistoryActionType
  description: string
  metadata: {
    sketchId?: string
    dimension?: string
    depth?: number
    tool?: string
    count?: number
  }
}

export interface HistoryStep {
  id: string
  timestamp: number
  action: HistoryAction
  state: {
    sketches: Record<string, DrawingItem[]>
    extrudedShapes: ExtrudedShape[]
  }
}

export interface DocumentHistory {
  steps: HistoryStep[]
  currentStepIndex: number
}

// History atom per document
export const documentHistoryAtom = atomFamily((documentId: string) =>
  atomWithStorage<DocumentHistory>(`polygon:history:document-${documentId}`, {
    steps: [{
      id: 'initial',
      timestamp: Date.now(),
      action: {
        type: 'create_sketch',
        description: 'Document created',
        metadata: {}
      },
      state: {
        sketches: { x: [], y: [], z: [] },
        extrudedShapes: []
      }
    }],
    currentStepIndex: 0
  })
)