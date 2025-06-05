import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { HistoryState, HistoryEntry, DocumentState } from '~/types/history'

// Default history state
const defaultHistoryState: HistoryState = {
  entries: [],
  currentVersion: 0,
  currentBranch: undefined,
  undoStack: [],
  redoStack: [],
  checkpoints: [0], // Version 0 is always a checkpoint
  isRecording: true,
  isSyncing: false,
}

// History state atom - stores the current history state
export const historyStateAtom = atom<HistoryState>(defaultHistoryState)

// Document state atom - stores the current document state
export const documentStateAtom = atom<DocumentState>({
  version: 0,
  sketches: {},
  objects: {},
  materials: {},
  settings: {},
  metadata: {
    lastModified: Date.now(),
    lastModifiedBy: '',
  },
})

// Derived atoms for convenience
export const canUndoAtom = atom((get) => {
  const history = get(historyStateAtom)
  return history.undoStack.length > 0
})

export const canRedoAtom = atom((get) => {
  const history = get(historyStateAtom)
  return history.redoStack.length > 0
})

export const currentVersionAtom = atom((get) => {
  const history = get(historyStateAtom)
  return history.currentVersion
})

export const historyEntriesAtom = atom((get) => {
  const history = get(historyStateAtom)
  return history.entries
})

// Local storage for offline support
export const localHistoryCacheAtom = atomWithStorage<{
  [documentId: string]: {
    entries: HistoryEntry[]
    lastSyncedVersion: number
  }
}>('polygon:history:cache', {})

// Atom for tracking unsaved changes
export const hasUnsavedChangesAtom = atom((get) => {
  const cache = get(localHistoryCacheAtom)
  return Object.values(cache).some(doc => doc.entries.length > 0)
})

// Atom for tracking active collaborators
export const activeCollaboratorsAtom = atom<{
  [userId: string]: {
    name: string
    color: string
    lastAction?: string
    lastActionTime?: number
  }
}>({})

// Atom for conflict tracking
export const historyConflictsAtom = atom<{
  documentId: string
  conflicts: Array<{
    localVersion: number
    serverVersion: number
    type: 'version_mismatch' | 'merge_conflict'
    resolvedAt?: number
  }>
}>({
  documentId: '',
  conflicts: [],
}) 