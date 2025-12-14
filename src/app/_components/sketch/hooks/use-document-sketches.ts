import { type DrawingItem, type HistoryAction } from "~/app/(protected)/atoms"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { documentSketchesAtom } from "~/app/(protected)/atoms"
import { documentSketchesFromOperationsAtom, documentPendingOperationsAtom, isUsingDatabaseAtom } from "~/app/(protected)/atoms/operations-atoms"
import { type Dimension } from "~/app/_components/sketch/_components/sketch-controls"
import { useCallback } from "react"
import type { Operation } from "~/types/operations"

// Custom hook for document sketches
// Supports both localStorage (legacy) and database (new) modes
export default function useDocumentSketches(
  documentId: string,
  dimension: Dimension,
  onHistoryAction?: (action: HistoryAction) => void
) {
  // Check which mode we're using
  const isUsingDatabase = useAtomValue(isUsingDatabaseAtom(documentId))

  // localStorage mode atoms
  const [localStorageSketches, setLocalStorageSketches] = useAtom(documentSketchesAtom(documentId))

  // Database mode atoms
  const dbSketches = useAtomValue(documentSketchesFromOperationsAtom(documentId))
  const setPendingOps = useSetAtom(documentPendingOperationsAtom(documentId))

  // Choose the right data source
  const documentSketches = isUsingDatabase ? dbSketches : localStorageSketches
  const setDocumentSketches = setLocalStorageSketches

  const addSketch = useCallback((sketch: DrawingItem) => {
    if (sketch.points.length < 2) return

    if (isUsingDatabase) {
      // Database mode: Create operation
      let operation: Operation;

      if (sketch.tool === 'rectangle') {
        operation = {
          id: sketch.id,
          sequence: 0, // Will be set by server
          type: 'sketch_rectangle' as const,
          parameters: {
            dimension: sketch.dimension,
            startPoint: sketch.points[0]!,
            endPoint: sketch.points[1]!,
            color: sketch.color,
          },
          dependencies: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      } else {
        operation = {
          id: sketch.id,
          sequence: 0, // Will be set by server
          type: 'sketch_line' as const,
          parameters: {
            dimension: sketch.dimension,
            points: sketch.points,
            color: sketch.color,
            closed: false,
          },
          dependencies: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // Add to pending operations (will be auto-saved)
      setPendingOps((prev) => [...prev, operation])
    } else {
      // localStorage mode (legacy)
      setDocumentSketches({
        ...documentSketches,
        [dimension]: [...documentSketches[dimension], sketch]
      })
    }

    // Record history
    onHistoryAction?.({
      type: 'create_sketch',
      description: `Drew ${sketch.tool} on ${dimension.toUpperCase()} plane`,
      metadata: {
        sketchId: sketch.id,
        dimension,
        tool: sketch.tool
      }
    })
  }, [isUsingDatabase, documentSketches, dimension, setDocumentSketches, setPendingOps, onHistoryAction])

  const undoLastSketch = useCallback(() => {
    const sketchCount = documentSketches[dimension].length
    if (sketchCount === 0) return

    setDocumentSketches({
      ...documentSketches,
      [dimension]: documentSketches[dimension].slice(0, -1)
    })

    onHistoryAction?.({
      type: 'undo_sketch',
      description: `Undid last sketch on ${dimension.toUpperCase()} plane`,
      metadata: { dimension }
    })
  }, [documentSketches, dimension, setDocumentSketches, onHistoryAction])

  const deleteSketch = useCallback((sketchId: string) => {
    setDocumentSketches({
      ...documentSketches,
      [dimension]: documentSketches[dimension].filter(s => s.id !== sketchId)
    })

    onHistoryAction?.({
      type: 'delete_sketch',
      description: `Deleted sketch on ${dimension.toUpperCase()} plane`,
      metadata: { sketchId, dimension }
    })
  }, [documentSketches, dimension, setDocumentSketches, onHistoryAction])

  const clearAllSketches = useCallback(() => {
    const sketchCount = documentSketches[dimension].length
    if (sketchCount === 0) return

    setDocumentSketches({
      ...documentSketches,
      [dimension]: []
    })

    onHistoryAction?.({
      type: 'clear_sketches',
      description: `Cleared all sketches on ${dimension.toUpperCase()} plane`,
      metadata: { dimension, count: sketchCount }
    })
  }, [documentSketches, dimension, setDocumentSketches, onHistoryAction])

  return {
    sketches: documentSketches[dimension],
    addSketch,
    undoLastSketch,
    deleteSketch,
    clearAllSketches
  }
}