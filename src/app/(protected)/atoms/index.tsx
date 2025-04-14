import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { type Dimension } from "~/app/_components/sketch-controls";

export const sidebarCollapsedAtom = atomWithStorage<boolean>("polygon:sidebar:collapsed", false);

export const activeOrganizationIdAtom = atomWithStorage<string | null>("polygon:activeOrganizationId", null);

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
  dimension: Dimension
}

export const sketchStateAtom = atom<SketchState>({
  selectedTool: 'pencil',
  dimension: 'x',
})