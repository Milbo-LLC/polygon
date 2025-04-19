import { atom } from "jotai";
import { atomFamily, atomWithStorage } from "jotai/utils";
import { type Tool, type Dimension } from "~/app/_components/sketch/_components/sketch-controls";

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

export type SketchTool = 'pencil' | 'rectangle'

export type SketchState = {
  selectedTool: SketchTool
  dimension: Dimension | null
}

export const sketchStateAtom = atom<SketchState>({
  selectedTool: 'pencil',
  dimension: null,
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