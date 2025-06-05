import { useEffect, useRef, useCallback } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { DocumentHistoryManager } from '~/lib/history/history-manager'
import {
  historyStateAtom,
  documentStateAtom,
  canUndoAtom,
  canRedoAtom,
  currentVersionAtom,
  hasUnsavedChangesAtom,
} from '~/app/(protected)/atoms/history'
import type { HistoryAction, HistoryOptions } from '~/types/history'
import { ActionType, ActionSubtype } from '~/types/history'

interface UseHistoryOptions extends HistoryOptions {
  documentId: string
  userId: string
}

export function useHistory({ documentId, userId, ...options }: UseHistoryOptions) {
  const managerRef = useRef<DocumentHistoryManager | null>(null)
  const [historyState, setHistoryState] = useAtom(historyStateAtom)
  const [documentState, setDocumentState] = useAtom(documentStateAtom)
  const canUndo = useAtomValue(canUndoAtom)
  const canRedo = useAtomValue(canRedoAtom)
  const currentVersion = useAtomValue(currentVersionAtom)
  const hasUnsavedChanges = useAtomValue(hasUnsavedChangesAtom)

  // Initialize history manager
  useEffect(() => {
    if (!managerRef.current) {
      // Create a getter and setter for Jotai atoms
      const get = (atom: any) => {
        if (atom === historyStateAtom) return historyState
        if (atom === documentStateAtom) return documentState
        // Add more atoms as needed
        return null
      }

      const set = (atom: any, value: any) => {
        if (atom === historyStateAtom) setHistoryState(value)
        if (atom === documentStateAtom) setDocumentState(value)
        // Add more atoms as needed
      }

      managerRef.current = new DocumentHistoryManager(
        get as any,
        set as any,
        documentId,
        userId,
        options
      )
    }

    return () => {
      managerRef.current?.destroy()
      managerRef.current = null
    }
  }, [documentId, userId])

  // Record an action
  const recordAction = useCallback(
    (action: Omit<HistoryAction, 'id' | 'timestamp' | 'userId'>) => {
      managerRef.current?.recordAction({
        ...action,
        userId,
      })
    },
    [userId]
  )

  // Undo
  const undo = useCallback(async () => {
    await managerRef.current?.undo()
  }, [])

  // Redo
  const redo = useCallback(async () => {
    await managerRef.current?.redo()
  }, [])

  // Go to a specific version
  const goto = useCallback(async (version: number) => {
    await managerRef.current?.goto(version)
  }, [])

  // Create checkpoint
  const createCheckpoint = useCallback(async () => {
    await managerRef.current?.createCheckpoint()
  }, [])

  // Clear history
  const clearHistory = useCallback(() => {
    managerRef.current?.clearHistory()
  }, [])

  // Get history entries
  const getHistory = useCallback(
    (options?: { from?: number; to?: number }) => {
      return managerRef.current?.getHistory(options) ?? []
    },
    []
  )

  // Helper to record sketch actions
  const recordSketchAction = useCallback(
    (
      subtype: ActionSubtype,
      targetId: string,
      parameters: Record<string, any>
    ) => {
      recordAction({
        type: ActionType.SKETCH,
        subtype,
        targetId,
        parameters,
      })
    },
    [recordAction]
  )

  // Helper to record 3D actions
  const record3DAction = useCallback(
    (
      subtype: ActionSubtype,
      targetId: string,
      parameters: Record<string, any>
    ) => {
      recordAction({
        type: ActionType.THREE_D,
        subtype,
        targetId,
        parameters,
      })
    },
    [recordAction]
  )

  return {
    // State
    canUndo,
    canRedo,
    currentVersion,
    hasUnsavedChanges,
    isRecording: historyState.isRecording,
    isSyncing: historyState.isSyncing,

    // Actions
    recordAction,
    recordSketchAction,
    record3DAction,
    undo,
    redo,
    goto,
    createCheckpoint,
    clearHistory,
    getHistory,

    // Direct access to state
    historyState,
    documentState,
  }
}

// Keyboard shortcuts hook
export function useHistoryKeyboardShortcuts({
  enabled = true,
  onUndo,
  onRedo,
}: {
  enabled?: boolean
  onUndo: () => void
  onRedo: () => void
}) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifier = isMac ? e.metaKey : e.ctrlKey

      if (modifier && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        onUndo()
      } else if (modifier && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        onRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, onUndo, onRedo])
} 