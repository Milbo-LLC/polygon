import type { DocumentState } from '~/types/history'

/**
 * Create a hash of the document state for quick comparison
 */
export function createStateHash(state: DocumentState): string {
  // Sort keys to ensure consistent hashing
  const sortedState = sortObjectKeys(state)
  const stateString = JSON.stringify(sortedState)
  
  // Use a simple hash function that works in both browser and Node
  return simpleHash(stateString)
}

/**
 * Create a delta between two states
 */
export function createStateDelta(
  oldState: DocumentState,
  newState: DocumentState
): Record<string, any> {
  const delta: Record<string, any> = {}
  
  // Compare top-level properties
  const allKeys = new Set([
    ...Object.keys(oldState),
    ...Object.keys(newState)
  ])
  
  for (const key of allKeys) {
    const oldValue = oldState[key as keyof DocumentState]
    const newValue = newState[key as keyof DocumentState]
    
    if (!deepEqual(oldValue, newValue)) {
      delta[key] = {
        old: oldValue,
        new: newValue
      }
    }
  }
  
  return delta
}

/**
 * Apply a delta to a state to produce a new state
 */
export function applyStateDelta(
  state: DocumentState,
  delta: Record<string, any>
): DocumentState {
  const newState = structuredClone(state) as DocumentState
  
  for (const [key, change] of Object.entries(delta)) {
    if (change.new !== undefined) {
      (newState as any)[key] = structuredClone(change.new)
    } else {
      delete (newState as any)[key]
    }
  }
  
  return newState
}

/**
 * Merge two document states, with the second state taking precedence
 */
export function mergeStates(
  state1: DocumentState,
  state2: DocumentState
): DocumentState {
  return {
    version: Math.max(state1.version, state2.version),
    sketches: { ...state1.sketches, ...state2.sketches },
    objects: { ...state1.objects, ...state2.objects },
    materials: { ...state1.materials, ...state2.materials },
    settings: { ...state1.settings, ...state2.settings },
    metadata: {
      lastModified: Math.max(
        state1.metadata.lastModified,
        state2.metadata.lastModified
      ),
      lastModifiedBy: state2.metadata.lastModifiedBy || state1.metadata.lastModifiedBy,
    },
  }
}

/**
 * Calculate the size of a state in bytes
 */
export function calculateStateSize(state: DocumentState): number {
  return new Blob([JSON.stringify(state)]).size
}

/**
 * Compress state for storage (placeholder - would use actual compression)
 */
export function compressState(state: DocumentState): string {
  // In a real implementation, use a compression library like pako
  return JSON.stringify(state)
}

/**
 * Decompress state from storage
 */
export function decompressState(compressed: string): DocumentState {
  // In a real implementation, use a decompression library
  return JSON.parse(compressed) as DocumentState
}

// ========== HELPER FUNCTIONS ==========

/**
 * Sort object keys recursively for consistent serialization
 */
function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys)
  }
  
  const sorted: Record<string, any> = {}
  const keys = Object.keys(obj).sort()
  
  for (const key of keys) {
    sorted[key] = sortObjectKeys(obj[key])
  }
  
  return sorted
}

/**
 * Simple hash function for browser environment
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16)
}

/**
 * Deep equality check for objects
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true
  
  if (a === null || b === null) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false
  
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  
  if (keysA.length !== keysB.length) return false
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false
    if (!deepEqual(a[key], b[key])) return false
  }
  
  return true
}

/**
 * Extract entity IDs from state for quick lookup
 */
export function extractEntityIds(state: DocumentState): {
  sketchIds: string[]
  objectIds: string[]
  materialIds: string[]
} {
  return {
    sketchIds: Object.keys(state.sketches || {}),
    objectIds: Object.keys(state.objects || {}),
    materialIds: Object.keys(state.materials || {}),
  }
}

/**
 * Validate state integrity
 */
export function validateState(state: DocumentState): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // Check required fields
  if (typeof state.version !== 'number') {
    errors.push('Invalid version')
  }
  
  if (!state.metadata || typeof state.metadata.lastModified !== 'number') {
    errors.push('Invalid metadata')
  }
  
  // Check object references
  const objectIds = new Set(Object.keys(state.objects || {}))
  
  // Validate sketch references in objects
  for (const [id, obj] of Object.entries(state.objects || {})) {
    if (obj.sourceSketchId && !state.sketches?.[obj.sourceSketchId]) {
      errors.push(`Object ${id} references non-existent sketch ${obj.sourceSketchId}`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
} 