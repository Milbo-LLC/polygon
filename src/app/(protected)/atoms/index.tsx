import { atom } from "jotai";
import { atomFamily, atomWithStorage } from "jotai/utils";
import {
  createEmptyDocumentState,
  createEmptySketchRecord,
  type Dimension,
  type DocumentHistory,
  type DrawingItem,
  type ExtrudedShape,
  type HistoryAction,
  type HistoryActionType,
  type HistoryStep,
  type Point3D,
  type Tool,
} from "~/types/modeling";

const createInitialHistorySnapshot = () => {
  const initial = createEmptyDocumentState();
  return {
    sketches: initial.sketches,
    extrudedShapes: initial.extrudedShapes,
  };
};

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

export const documentSketchesAtom = atomFamily((documentId: string) =>
  atomWithStorage<Record<Dimension, DrawingItem[]>>(
    `polygon:sketch:document-${documentId}`,
    createEmptySketchRecord(),
  ),
);

export const documentExtrudedShapesAtom = atomFamily((documentId: string) =>
  atomWithStorage<ExtrudedShape[]>(`polygon:extrude:document-${documentId}`, []),
)

export type ExtrudeState = {
  selectedSketchId: string | null
  depth: number
}

export const extrudeStateAtom = atom<ExtrudeState>({
  selectedSketchId: null,
  depth: 10,
})

// History types
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
        ...createInitialHistorySnapshot()
      }
    }],
    currentStepIndex: 0
  })
)

export type { Point3D, DrawingItem, ExtrudedShape, HistoryActionType, HistoryAction, HistoryStep, DocumentHistory };