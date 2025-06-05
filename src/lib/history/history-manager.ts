import { type Getter, type Setter } from 'jotai'
import { v4 as uuidv4 } from 'uuid'
import type {
  HistoryAction,
  HistoryEntry,
  HistoryManager,
  HistoryOptions,
  DocumentState,
  DocumentBranch,
  HistoryState,
} from '~/types/history'
import {
  historyStateAtom,
  documentStateAtom,
  localHistoryCacheAtom,
} from '~/app/(protected)/atoms/history'
import { applyAction, revertAction } from './state-operations'
import { createStateHash, createStateDelta, applyStateDelta } from './state-utils'

export class DocumentHistoryManager implements HistoryManager {
  private get: Getter
  private set: Setter
  private documentId: string
  private userId: string
  private options: Required<HistoryOptions>
  private syncTimer?: NodeJS.Timeout

  constructor(
    get: Getter,
    set: Setter,
    documentId: string,
    userId: string,
    options: HistoryOptions = {}
  ) {
    this.get = get
    this.set = set
    this.documentId = documentId
    this.userId = userId
    this.options = {
      maxUndoLevels: options.maxUndoLevels ?? 100,
      checkpointInterval: options.checkpointInterval ?? 10,
      syncInterval: options.syncInterval ?? 5000,
      enableBranching: options.enableBranching ?? false,
    }

    // Start sync timer if sync interval is set
    if (this.options.syncInterval > 0) {
      this.startSyncTimer()
    }
  }

  recordAction(action: Omit<HistoryAction, 'id' | 'timestamp'>): void {
    const historyState = this.get(historyStateAtom)
    const documentState = this.get(documentStateAtom)

    if (!historyState.isRecording) return

    // Create the full action
    const fullAction: HistoryAction = {
      ...action,
      id: uuidv4(),
      timestamp: Date.now(),
      userId: this.userId,
    }

    // Apply the action to get the new state
    const newDocumentState = applyAction(documentState, fullAction)

    // Update version
    const newVersion = historyState.currentVersion + 1
    newDocumentState.version = newVersion
    newDocumentState.metadata.lastModified = Date.now()
    newDocumentState.metadata.lastModifiedBy = this.userId

    // Create history entry
    const entry: HistoryEntry = {
      id: uuidv4(),
      createdAt: new Date(),
      documentId: this.documentId,
      userId: this.userId,
      version: newVersion,
      action: fullAction,
      branchId: historyState.currentBranch,
      isCheckpoint: this.shouldCreateCheckpoint(newVersion),
    }

    // Update history state
    const newHistoryState: HistoryState = {
      ...historyState,
      entries: [...historyState.entries, entry],
      currentVersion: newVersion,
      undoStack: [...historyState.undoStack, fullAction.id],
      redoStack: [], // Clear redo stack on new action
      checkpoints: entry.isCheckpoint
        ? [...historyState.checkpoints, newVersion]
        : historyState.checkpoints,
    }

    // Trim undo stack if needed
    if (newHistoryState.undoStack.length > this.options.maxUndoLevels) {
      const trimCount = newHistoryState.undoStack.length - this.options.maxUndoLevels
      newHistoryState.undoStack = newHistoryState.undoStack.slice(trimCount)
      // Also trim entries that are no longer reachable
      const oldestUndoActionId = newHistoryState.undoStack[0]
      const oldestUndoEntry = newHistoryState.entries.find(
        e => e.action.id === oldestUndoActionId
      )
      if (oldestUndoEntry) {
        newHistoryState.entries = newHistoryState.entries.filter(
          e => e.version >= oldestUndoEntry.version
        )
      }
    }

    // Update atoms
    this.set(historyStateAtom, newHistoryState)
    this.set(documentStateAtom, newDocumentState)

    // Add to local cache for sync
    this.addToLocalCache(entry)
  }

  async undo(): Promise<boolean> {
    const historyState = this.get(historyStateAtom)
    const actionId = historyState.undoStack[historyState.undoStack.length - 1]
    
    if (!actionId || historyState.undoStack.length === 0) return false
    
    const entry = historyState.entries.find(e => e.id === actionId)
    if (!entry) return false

    // Revert the action
    const newDocumentState = revertAction(this.get(documentStateAtom), entry.action)
    newDocumentState.version = entry.version - 1
    newDocumentState.metadata.lastModified = Date.now()
    newDocumentState.metadata.lastModifiedBy = entry.action.userId || this.userId

    // Update history state
    const newHistoryState: HistoryState = {
      ...historyState,
      currentVersion: historyState.currentVersion - 1,
      undoStack: historyState.undoStack.slice(0, -1),
      redoStack: [...historyState.redoStack, actionId],
    }

    // Update atoms
    this.set(historyStateAtom, newHistoryState)
    this.set(documentStateAtom, newDocumentState)

    return true
  }

  async redo(): Promise<boolean> {
    const historyState = this.get(historyStateAtom)
    const actionId = historyState.redoStack[historyState.redoStack.length - 1]
    
    if (!actionId || historyState.redoStack.length === 0) return false
    
    const entry = historyState.entries.find(e => e.id === actionId)
    if (!entry) return false

    // Reapply the action
    const newDocumentState = applyAction(this.get(documentStateAtom), entry.action)
    newDocumentState.version = entry.version
    newDocumentState.metadata.lastModified = Date.now()
    newDocumentState.metadata.lastModifiedBy = entry.action.userId || this.userId

    // Update history state
    const newHistoryState: HistoryState = {
      ...historyState,
      currentVersion: historyState.currentVersion + 1,
      redoStack: historyState.redoStack.slice(0, -1),
      undoStack: [...historyState.undoStack, actionId],
    }

    // Update atoms
    this.set(historyStateAtom, newHistoryState)
    this.set(documentStateAtom, newDocumentState)

    return true
  }

  async goto(version: number): Promise<void> {
    const historyState = this.get(historyStateAtom)
    
    if (version < 0 || version > historyState.entries.length) return
    if (version === historyState.currentVersion) return

    // Find the most recent checkpoint before or at the target version
    const nearestCheckpoint = this.findNearestCheckpoint(version)
    
    // Load the checkpoint state
    const checkpointState = await this.loadCheckpointState(nearestCheckpoint)
    
    // Apply actions from checkpoint to target version
    let currentState = checkpointState
    const actionsToApply = historyState.entries.filter(
      e => e.version > nearestCheckpoint && e.version <= version
    )

    for (const entry of actionsToApply) {
      currentState = applyAction(currentState, entry.action)
    }

    currentState.version = version
    currentState.metadata.lastModified = Date.now()
    currentState.metadata.lastModifiedBy = this.userId

    // Update atoms
    this.set(documentStateAtom, currentState)
    this.set(historyStateAtom, {
      ...historyState,
      currentVersion: version,
      // Reset undo/redo stacks when jumping to a specific version
      undoStack: historyState.entries
        .filter(e => e.version <= version)
        .map(e => e.action.id),
      redoStack: historyState.entries
        .filter(e => e.version > version)
        .map(e => e.action.id)
        .reverse(),
    })
  }

  async createCheckpoint(): Promise<void> {
    const historyState = this.get(historyStateAtom)
    const documentState = this.get(documentStateAtom)

    // Save the current state as a checkpoint
    await this.saveCheckpointState(historyState.currentVersion, documentState)

    // Update checkpoints list
    this.set(historyStateAtom, {
      ...historyState,
      checkpoints: [...historyState.checkpoints, historyState.currentVersion],
    })
  }

  async createBranch(name: string): Promise<DocumentBranch> {
    if (!this.options.enableBranching) {
      throw new Error('Branching is not enabled')
    }

    const historyState = this.get(historyStateAtom)
    
    const branch: DocumentBranch = {
      id: uuidv4(),
      name,
      documentId: this.documentId,
      baseVersion: historyState.currentVersion,
      headVersion: historyState.currentVersion,
      status: 'active',
      createdAt: new Date(),
    }

    // In a real implementation, save this to the database
    // For now, just update the history state
    this.set(historyStateAtom, {
      ...historyState,
      currentBranch: branch.id,
    })

    return branch
  }

  async mergeBranch(branchId: string): Promise<void> {
    // This would involve complex merge logic
    // For now, throw not implemented
    throw new Error('Branch merging not implemented yet')
  }

  getHistory(options?: { from?: number; to?: number }): HistoryEntry[] {
    const historyState = this.get(historyStateAtom)
    const { from = 0, to = historyState.currentVersion } = options ?? {}
    
    return historyState.entries.filter(
      e => e.version >= from && e.version <= to
    )
  }

  clearHistory(): void {
    const documentState = this.get(documentStateAtom)
    
    // Reset to initial state but keep current document state
    this.set(historyStateAtom, {
      entries: [],
      currentVersion: 0,
      currentBranch: undefined,
      undoStack: [],
      redoStack: [],
      checkpoints: [0],
      isRecording: true,
      isSyncing: false,
    })

    // Reset document version
    this.set(documentStateAtom, {
      ...documentState,
      version: 0,
    })

    // Clear local cache
    const cache = this.get(localHistoryCacheAtom)
    delete cache[this.documentId]
    this.set(localHistoryCacheAtom, cache)
  }

  // Private helper methods

  private shouldCreateCheckpoint(version: number): boolean {
    return version % this.options.checkpointInterval === 0
  }

  private findNearestCheckpoint(version: number): number {
    const historyState = this.get(historyStateAtom)
    const checkpoints = historyState.checkpoints
    
    // Find the highest checkpoint that's <= version
    let nearest = 0
    for (const checkpoint of checkpoints) {
      if (checkpoint <= version) {
        nearest = checkpoint
      } else {
        break
      }
    }
    
    return nearest
  }

  private async loadCheckpointState(version: number): Promise<DocumentState> {
    // In a real implementation, this would load from the database
    // For now, return a base state
    if (version === 0) {
      return {
        version: 0,
        sketches: {},
        objects: {},
        materials: {},
        settings: {},
        metadata: {
          lastModified: Date.now(),
          lastModifiedBy: this.userId,
        },
      }
    }
    
    // This would normally load from DocumentState table
    throw new Error(`Checkpoint ${version} not found`)
  }

  private async saveCheckpointState(
    version: number,
    state: DocumentState
  ): Promise<void> {
    // In a real implementation, save to the database
    console.log('Saving checkpoint', { version, state })
  }

  private addToLocalCache(entry: HistoryEntry): void {
    const cache = this.get(localHistoryCacheAtom)
    
    if (!cache[this.documentId]) {
      cache[this.documentId] = {
        entries: [],
        lastSyncedVersion: 0,
      }
    }
    
    cache[this.documentId]!.entries.push(entry)
    this.set(localHistoryCacheAtom, { ...cache })
  }

  private startSyncTimer(): void {
    this.syncTimer = setInterval(() => {
      void this.syncToServer()
    }, this.options.syncInterval)
  }

  private async syncToServer(): Promise<void> {
    const cache = this.get(localHistoryCacheAtom)
    const documentCache = cache[this.documentId]
    
    if (!documentCache || documentCache.entries.length === 0) return

    // Set syncing flag
    const historyState = this.get(historyStateAtom)
    this.set(historyStateAtom, { ...historyState, isSyncing: true })

    try {
      // Convert entries for API
      const entriesToSync = documentCache.entries.map(entry => ({
        version: entry.version,
        actionType: entry.action.type,
        actionSubtype: entry.action.subtype,
        targetId: entry.action.targetId,
        parentEntryId: entry.action.parentActionId,
        parameters: entry.action.parameters,
        metadata: entry.action.metadata,
        isCheckpoint: entry.isCheckpoint,
      }))

      // Note: In a real implementation, you would call the tRPC API here
      // await api.history.saveEntries.mutate({
      //   documentId: this.documentId,
      //   entries: entriesToSync,
      // })
      
      console.log('Syncing entries to server', entriesToSync)
      
      // Clear synced entries from cache
      cache[this.documentId] = {
        entries: [],
        lastSyncedVersion: historyState.currentVersion,
      }
      this.set(localHistoryCacheAtom, { ...cache })
    } catch (error) {
      console.error('Failed to sync history', error)
    } finally {
      // Clear syncing flag
      const currentHistoryState = this.get(historyStateAtom)
      this.set(historyStateAtom, { ...currentHistoryState, isSyncing: false })
    }
  }

  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
    }
  }
} 