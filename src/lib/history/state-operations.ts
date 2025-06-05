import type { DocumentState, HistoryAction } from '~/types/history'
import { ActionType, ActionSubtype } from '~/types/history'

/**
 * Apply an action to the document state and return the new state
 */
export function applyAction(
  state: DocumentState,
  action: HistoryAction
): DocumentState {
  // Clone the state to avoid mutations
  const newState = structuredClone(state) as DocumentState

  switch (action.type) {
    case ActionType.SKETCH:
      return applySketchAction(newState, action)
    case ActionType.THREE_D:
      return apply3DAction(newState, action)
    case ActionType.ASSEMBLY:
      return applyAssemblyAction(newState, action)
    case ActionType.APPEARANCE:
      return applyAppearanceAction(newState, action)
    case ActionType.ANNOTATION:
      return applyAnnotationAction(newState, action)
    case ActionType.DOCUMENT:
      return applyDocumentAction(newState, action)
    default:
      console.warn(`Unknown action type: ${action.type}`)
      return newState
  }
}

/**
 * Revert an action from the document state and return the previous state
 */
export function revertAction(
  state: DocumentState,
  action: HistoryAction
): DocumentState {
  // Clone the state to avoid mutations
  const newState = structuredClone(state) as DocumentState

  switch (action.type) {
    case ActionType.SKETCH:
      return revertSketchAction(newState, action)
    case ActionType.THREE_D:
      return revert3DAction(newState, action)
    case ActionType.ASSEMBLY:
      return revertAssemblyAction(newState, action)
    case ActionType.APPEARANCE:
      return revertAppearanceAction(newState, action)
    case ActionType.ANNOTATION:
      return revertAnnotationAction(newState, action)
    case ActionType.DOCUMENT:
      return revertDocumentAction(newState, action)
    default:
      console.warn(`Unknown action type: ${action.type}`)
      return newState
  }
}

// ========== SKETCH ACTIONS ==========

function applySketchAction(
  state: DocumentState,
  action: HistoryAction
): DocumentState {
  if (!state.sketches) state.sketches = {}

  switch (action.subtype) {
    case ActionSubtype.DRAW_LINE:
    case ActionSubtype.DRAW_RECTANGLE:
    case ActionSubtype.DRAW_CIRCLE:
      if (action.targetId) {
        state.sketches[action.targetId] = {
          id: action.targetId,
          type: action.subtype,
          ...action.parameters,
          createdAt: action.timestamp,
          createdBy: action.userId,
        }
      }
      break
    case ActionSubtype.DELETE:
      if (action.targetId && state.sketches[action.targetId]) {
        delete state.sketches[action.targetId]
      }
      break
    case ActionSubtype.MODIFY:
      if (action.targetId && state.sketches[action.targetId]) {
        state.sketches[action.targetId] = {
          ...state.sketches[action.targetId],
          ...action.parameters,
          modifiedAt: action.timestamp,
          modifiedBy: action.userId,
        }
      }
      break
  }

  return state
}

function revertSketchAction(
  state: DocumentState,
  action: HistoryAction
): DocumentState {
  if (!state.sketches) state.sketches = {}

  switch (action.subtype) {
    case ActionSubtype.DRAW_LINE:
    case ActionSubtype.DRAW_RECTANGLE:
    case ActionSubtype.DRAW_CIRCLE:
      // Remove the created sketch
      if (action.targetId && state.sketches[action.targetId]) {
        delete state.sketches[action.targetId]
      }
      break
    case ActionSubtype.DELETE:
      // Restore the deleted sketch (would need previous state data)
      // For now, we'll need to store the previous state in action.parameters
      if (action.targetId && action.parameters.previousState) {
        state.sketches[action.targetId] = action.parameters.previousState
      }
      break
    case ActionSubtype.MODIFY:
      // Restore previous values
      if (action.targetId && action.parameters.previousState) {
        state.sketches[action.targetId] = action.parameters.previousState
      }
      break
  }

  return state
}

// ========== 3D ACTIONS ==========

function apply3DAction(
  state: DocumentState,
  action: HistoryAction
): DocumentState {
  if (!state.objects) state.objects = {}

  switch (action.subtype) {
    case ActionSubtype.EXTRUDE:
      if (action.targetId) {
        state.objects[action.targetId] = {
          id: action.targetId,
          type: 'extrusion',
          sourceSketchId: action.parameters.sketchId,
          ...action.parameters,
          createdAt: action.timestamp,
          createdBy: action.userId,
        }
      }
      break
    case ActionSubtype.REVOLVE:
      if (action.targetId) {
        state.objects[action.targetId] = {
          id: action.targetId,
          type: 'revolution',
          sourceSketchId: action.parameters.sketchId,
          ...action.parameters,
          createdAt: action.timestamp,
          createdBy: action.userId,
        }
      }
      break
    case ActionSubtype.BOOLEAN_UNION:
    case ActionSubtype.BOOLEAN_SUBTRACT:
    case ActionSubtype.BOOLEAN_INTERSECT:
      if (action.targetId) {
        // Create new boolean object
        state.objects[action.targetId] = {
          id: action.targetId,
          type: 'boolean',
          operation: action.subtype,
          ...action.parameters,
          createdAt: action.timestamp,
          createdBy: action.userId,
        }
        // Mark source objects as consumed
        const targetIds = action.parameters.targetIds || []
        targetIds.forEach((id: string) => {
          if (state.objects[id]) {
            state.objects[id].consumedBy = action.targetId
          }
        })
      }
      break
  }

  return state
}

function revert3DAction(
  state: DocumentState,
  action: HistoryAction
): DocumentState {
  if (!state.objects) state.objects = {}

  switch (action.subtype) {
    case ActionSubtype.EXTRUDE:
    case ActionSubtype.REVOLVE:
      // Remove the created 3D object
      if (action.targetId && state.objects[action.targetId]) {
        delete state.objects[action.targetId]
      }
      break
    case ActionSubtype.BOOLEAN_UNION:
    case ActionSubtype.BOOLEAN_SUBTRACT:
    case ActionSubtype.BOOLEAN_INTERSECT:
      // Remove boolean result and restore source objects
      if (action.targetId) {
        delete state.objects[action.targetId]
        // Restore consumed objects
        const targetIds = action.parameters.targetIds || []
        targetIds.forEach((id: string) => {
          if (state.objects[id]) {
            delete state.objects[id].consumedBy
          }
        })
      }
      break
  }

  return state
}

// ========== ASSEMBLY ACTIONS ==========

function applyAssemblyAction(
  state: DocumentState,
  action: HistoryAction
): DocumentState {
  // Assembly operations would modify groups/components
  return state
}

function revertAssemblyAction(
  state: DocumentState,
  action: HistoryAction
): DocumentState {
  // Revert assembly operations
  return state
}

// ========== APPEARANCE ACTIONS ==========

function applyAppearanceAction(
  state: DocumentState,
  action: HistoryAction
): DocumentState {
  if (!state.materials) state.materials = {}

  switch (action.subtype) {
    case ActionSubtype.APPLY_MATERIAL:
    case ActionSubtype.CHANGE_COLOR:
      if (action.targetId) {
        state.materials[action.targetId] = {
          ...state.materials[action.targetId],
          ...action.parameters,
          modifiedAt: action.timestamp,
          modifiedBy: action.userId,
        }
      }
      break
  }

  return state
}

function revertAppearanceAction(
  state: DocumentState,
  action: HistoryAction
): DocumentState {
  if (!state.materials) state.materials = {}

  switch (action.subtype) {
    case ActionSubtype.APPLY_MATERIAL:
    case ActionSubtype.CHANGE_COLOR:
      if (action.targetId && action.parameters.previousState) {
        state.materials[action.targetId] = action.parameters.previousState
      }
      break
  }

  return state
}

// ========== ANNOTATION ACTIONS ==========

function applyAnnotationAction(
  state: DocumentState,
  action: HistoryAction
): DocumentState {
  // Handle annotation actions
  return state
}

function revertAnnotationAction(
  state: DocumentState,
  action: HistoryAction
): DocumentState {
  // Revert annotation actions
  return state
}

// ========== DOCUMENT ACTIONS ==========

function applyDocumentAction(
  state: DocumentState,
  action: HistoryAction
): DocumentState {
  switch (action.subtype) {
    case ActionSubtype.SETTINGS_CHANGE:
      state.settings = {
        ...state.settings,
        ...action.parameters,
      }
      break
  }

  return state
}

function revertDocumentAction(
  state: DocumentState,
  action: HistoryAction
): DocumentState {
  switch (action.subtype) {
    case ActionSubtype.SETTINGS_CHANGE:
      if (action.parameters.previousState) {
        state.settings = action.parameters.previousState
      }
      break
  }

  return state
} 