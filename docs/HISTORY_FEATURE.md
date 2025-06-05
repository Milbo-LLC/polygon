# History Feature Documentation

## Overview

The history feature provides comprehensive undo/redo functionality for the CAD application, enabling users to navigate through their design changes with confidence. It supports local and server persistence, collaborative awareness, and efficient state management.

## Architecture

### Core Components

1. **Database Schema** (Prisma)
   - `HistoryEntry`: Records individual actions with metadata
   - `DocumentState`: Stores complete state snapshots at checkpoints
   - `DocumentBranch`: Supports branching workflows (future feature)

2. **State Management** (Jotai)
   - `historyStateAtom`: Tracks current history state
   - `documentStateAtom`: Maintains current document state
   - `localHistoryCacheAtom`: Provides offline support

3. **History Manager** (`DocumentHistoryManager`)
   - Handles action recording, undo/redo operations
   - Manages state checkpoints and synchronization
   - Provides efficient state reconstruction

4. **React Integration**
   - `useHistory` hook: Primary interface for components
   - `useHistoryKeyboardShortcuts`: Keyboard shortcut handling
   - `HistoryControls`: UI component for history actions

## Usage

### Basic Integration

```typescript
import { useHistory } from '~/hooks/use-history'
import { ActionType, ActionSubtype } from '~/types/history'

function MyComponent() {
  const history = useHistory({
    documentId: 'doc-123',
    userId: 'user-456',
  })

  // Record an action
  const handleDrawLine = (lineData) => {
    history.recordSketchAction(
      ActionSubtype.DRAW_LINE,
      lineData.id,
      {
        points: lineData.points,
        dimension: 'x',
        tool: 'pencil',
        color: '#000000',
      }
    )
  }

  // Undo/Redo
  return (
    <div>
      <button onClick={history.undo} disabled={!history.canUndo}>
        Undo
      </button>
      <button onClick={history.redo} disabled={!history.canRedo}>
        Redo
      </button>
      <span>Version: {history.currentVersion}</span>
    </div>
  )
}
```

### Keyboard Shortcuts

The history system automatically handles standard keyboard shortcuts:
- **Undo**: Ctrl+Z (Cmd+Z on Mac)
- **Redo**: Ctrl+Y or Ctrl+Shift+Z (Cmd+Y or Cmd+Shift+Z on Mac)

### Recording Actions

Actions are categorized by type and subtype:

```typescript
// Sketch actions
history.recordSketchAction(
  ActionSubtype.DRAW_RECTANGLE,
  'rect-123',
  {
    startPoint: { x: 0, y: 0, z: 0 },
    endPoint: { x: 100, y: 100, z: 0 },
    dimension: 'z',
    tool: 'rectangle',
  }
)

// 3D actions
history.record3DAction(
  ActionSubtype.EXTRUDE,
  'extrude-456',
  {
    sketchId: 'sketch-123',
    distance: 50,
    direction: 'positive',
  }
)
```

## Action Types

### Sketch Actions
- `DRAW_LINE`: Create line sketch
- `DRAW_RECTANGLE`: Create rectangle sketch
- `DRAW_CIRCLE`: Create circle sketch
- `ADD_CONSTRAINT`: Add geometric constraint
- `REMOVE_CONSTRAINT`: Remove constraint

### 3D Actions
- `EXTRUDE`: Extrude sketch to 3D
- `REVOLVE`: Revolve sketch around axis
- `LOFT`: Loft between sketches
- `SWEEP`: Sweep along path
- `BOOLEAN_UNION/SUBTRACT/INTERSECT`: Boolean operations

### Assembly Actions
- `GROUP`: Group objects
- `UNGROUP`: Ungroup objects
- `ADD_COMPONENT`: Add to assembly
- `REMOVE_COMPONENT`: Remove from assembly

### Appearance Actions
- `APPLY_MATERIAL`: Apply material
- `CHANGE_COLOR`: Change color
- `SET_VISIBILITY`: Toggle visibility
- `SET_TRANSPARENCY`: Set transparency

### Document Actions
- `IMPORT`: Import file
- `EXPORT`: Export file
- `SETTINGS_CHANGE`: Change settings

## Performance Optimizations

### Checkpointing
- Automatic checkpoints every 10 actions (configurable)
- Strategic checkpointing for complex operations
- Efficient state reconstruction from nearest checkpoint

### State Storage
- Hybrid approach: deltas between checkpoints
- Compression for large states
- Lazy loading of historical data

### Synchronization
- Batched updates to server (default: 5 seconds)
- Local cache for offline support
- Conflict detection and resolution

## Server Integration

### tRPC Endpoints

```typescript
// Save history entries
api.history.saveEntries.mutate({
  documentId: 'doc-123',
  entries: [...],
})

// Get history
const history = api.history.getHistory.query({
  documentId: 'doc-123',
  from: 0,
  to: 100,
})

// Load checkpoint
const checkpoint = api.history.getCheckpoint.query({
  documentId: 'doc-123',
  version: 50,
})
```

## Configuration

```typescript
const history = useHistory({
  documentId: 'doc-123',
  userId: 'user-456',
  maxUndoLevels: 100,      // Maximum undo stack size
  checkpointInterval: 10,   // Actions between checkpoints
  syncInterval: 5000,       // Milliseconds between syncs
  enableBranching: false,   // Enable branch support
})
```

## Future Enhancements

1. **Branching and Merging**
   - Create alternative design branches
   - Compare and merge changes
   - Visual branch timeline

2. **Collaborative Features**
   - Real-time collaborative cursors
   - Conflict resolution UI
   - Attribution in history timeline

3. **Advanced Visualization**
   - Visual history timeline
   - Preview on hover
   - Diff view between versions

4. **Performance**
   - Streaming for large histories
   - Progressive loading
   - Smart compression algorithms

## Troubleshooting

### Common Issues

1. **History not syncing**
   - Check network connectivity
   - Verify user permissions
   - Check browser console for errors

2. **Undo/Redo not working**
   - Ensure `isRecording` is true
   - Check if action was properly recorded
   - Verify keyboard shortcuts aren't captured

3. **Performance issues**
   - Increase checkpoint interval
   - Reduce max undo levels
   - Enable state compression

### Debug Mode

Enable debug logging:
```typescript
localStorage.setItem('polygon:history:debug', 'true')
```

## Best Practices

1. **Action Granularity**
   - Record meaningful user actions
   - Avoid recording intermediate states
   - Batch related changes

2. **State Management**
   - Keep state serializable
   - Avoid circular references
   - Minimize state size

3. **Error Handling**
   - Gracefully handle sync failures
   - Provide user feedback
   - Maintain local functionality

4. **Testing**
   - Test undo/redo sequences
   - Verify state consistency
   - Test offline scenarios 