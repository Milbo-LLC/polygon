import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import type { Point3D } from "./index";

// ============================================================================
// SELECTION ELEMENT TYPES
// ============================================================================

export type SelectableElementType =
  | "sketch" // Entire sketch (all lines/points)
  | "line" // Individual line segment
  | "point" // Individual vertex/point
  | "edge" // Edge of extruded shape
  | "face"; // Face of extruded shape

export interface SelectableElement {
  type: SelectableElementType;
  id: string; // Unique identifier
  parentId?: string; // ID of parent element (e.g., sketch ID for a line)
  operationId?: string; // Associated operation (for history tracking)
  geometry?: {
    // For raycasting
    points?: Point3D[]; // For lines and sketches
    position?: Point3D; // For points
    normal?: Point3D; // For faces
  };
}

// ============================================================================
// SELECTION STATE
// ============================================================================

export interface SelectionState {
  // Primary selection (single or multiple)
  selectedElements: SelectableElement[];

  // Hover state (single element at a time)
  hoveredElement: SelectableElement | null;

  // Multi-selection enabled (Shift key held)
  isMultiSelectMode: boolean;

  // Bounding box visible for selected elements
  showBoundingBox: boolean;

  // Active tool (affects what actions are available)
  activeTool: string | null;
}

// Document-specific selection state
export const documentSelectionAtom = atomFamily((documentId: string) =>
  atom<SelectionState>({
    selectedElements: [],
    hoveredElement: null,
    isMultiSelectMode: false,
    showBoundingBox: true,
    activeTool: null,
  }),
);

// Derived atoms for convenience
export const selectedSketchIdsAtom = atomFamily((documentId: string) =>
  atom((get) => {
    const selection = get(documentSelectionAtom(documentId));
    return selection.selectedElements
      .filter((el) => el.type === "sketch")
      .map((el) => el.id);
  }),
);

export const hasSelectionAtom = atomFamily((documentId: string) =>
  atom((get) => {
    const selection = get(documentSelectionAtom(documentId));
    return selection.selectedElements.length > 0;
  }),
);
