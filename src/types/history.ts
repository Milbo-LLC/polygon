// ========== ACTION TYPES ==========

export enum ActionType {
  // Sketch Actions
  SKETCH = 'sketch',
  // 3D Actions
  THREE_D = '3d',
  // Assembly Actions
  ASSEMBLY = 'assembly',
  // Appearance Actions
  APPEARANCE = 'appearance',
  // Annotation Actions
  ANNOTATION = 'annotation',
  // Document Actions
  DOCUMENT = 'document',
}

export enum ActionSubtype {
  // Common
  CREATE = 'create',
  MODIFY = 'modify',
  DELETE = 'delete',
  MOVE = 'move',
  DUPLICATE = 'duplicate',
  
  // Sketch specific
  DRAW_LINE = 'draw_line',
  DRAW_RECTANGLE = 'draw_rectangle',
  DRAW_CIRCLE = 'draw_circle',
  ADD_CONSTRAINT = 'add_constraint',
  REMOVE_CONSTRAINT = 'remove_constraint',
  
  // 3D specific
  EXTRUDE = 'extrude',
  REVOLVE = 'revolve',
  LOFT = 'loft',
  SWEEP = 'sweep',
  BOOLEAN_UNION = 'boolean_union',
  BOOLEAN_SUBTRACT = 'boolean_subtract',
  BOOLEAN_INTERSECT = 'boolean_intersect',
  
  // Assembly specific
  GROUP = 'group',
  UNGROUP = 'ungroup',
  ADD_COMPONENT = 'add_component',
  REMOVE_COMPONENT = 'remove_component',
  
  // Appearance specific
  APPLY_MATERIAL = 'apply_material',
  CHANGE_COLOR = 'change_color',
  SET_VISIBILITY = 'set_visibility',
  SET_TRANSPARENCY = 'set_transparency',
  
  // Document specific
  IMPORT = 'import',
  EXPORT = 'export',
  SETTINGS_CHANGE = 'settings_change',
}

// ========== INTERFACES ==========

export interface HistoryAction {
  id: string
  timestamp: number
  userId: string
  type: ActionType
  subtype: ActionSubtype
  targetId?: string
  parentActionId?: string
  parameters: Record<string, any>
  metadata?: {
    tool?: string
    dimension?: string
    [key: string]: any
  }
}

export interface HistoryEntry {
  id: string
  createdAt: Date
  documentId: string
  userId: string
  version: number
  action: HistoryAction
  branchId?: string
  isCheckpoint: boolean
}

export interface DocumentState {
  version: number
  sketches: Record<string, any>
  objects: Record<string, any>
  materials: Record<string, any>
  settings: Record<string, any>
  metadata: {
    lastModified: number
    lastModifiedBy: string
  }
}

export interface HistoryState {
  entries: HistoryEntry[]
  currentVersion: number
  currentBranch?: string
  undoStack: string[] // Action IDs
  redoStack: string[] // Action IDs
  checkpoints: number[] // Version numbers
  isRecording: boolean
  isSyncing: boolean
}

export interface StateSnapshot {
  id: string
  documentId: string
  version: number
  state: DocumentState
  stateHash: string
  isCheckpoint: boolean
  createdAt: Date
}

export interface DocumentBranch {
  id: string
  name: string
  documentId: string
  baseVersion: number
  headVersion: number
  status: 'active' | 'merged' | 'abandoned'
  createdAt: Date
  mergedAt?: Date
}

// ========== ACTION CREATORS ==========

export type SketchActionParameters = {
  [ActionSubtype.DRAW_LINE]: {
    points: Array<{ x: number; y: number; z: number }>
    dimension: 'x' | 'y' | 'z'
    tool: string
    color?: string
  }
  [ActionSubtype.DRAW_RECTANGLE]: {
    startPoint: { x: number; y: number; z: number }
    endPoint: { x: number; y: number; z: number }
    dimension: 'x' | 'y' | 'z'
    tool: string
    color?: string
  }
  [ActionSubtype.ADD_CONSTRAINT]: {
    type: 'horizontal' | 'vertical' | 'parallel' | 'perpendicular' | 'distance'
    targets: string[]
    value?: number
  }
}

export type ThreeDActionParameters = {
  [ActionSubtype.EXTRUDE]: {
    sketchId: string
    distance: number
    direction: 'positive' | 'negative' | 'both'
  }
  [ActionSubtype.REVOLVE]: {
    sketchId: string
    angle: number
    axis: { origin: any; direction: any }
  }
  [ActionSubtype.BOOLEAN_UNION]: {
    targetIds: string[]
  }
  [ActionSubtype.BOOLEAN_SUBTRACT]: {
    targetId: string
    toolIds: string[]
  }
}

// ========== UTILITIES ==========

export interface HistoryOptions {
  maxUndoLevels?: number
  checkpointInterval?: number
  syncInterval?: number
  enableBranching?: boolean
}

export interface HistoryManager {
  recordAction(action: Omit<HistoryAction, 'id' | 'timestamp'>): void
  undo(): Promise<void>
  redo(): Promise<void>
  goto(version: number): Promise<void>
  createCheckpoint(): Promise<void>
  createBranch(name: string): Promise<DocumentBranch>
  mergeBranch(branchId: string): Promise<void>
  getHistory(options?: { from?: number; to?: number }): HistoryEntry[]
  clearHistory(): void
} 