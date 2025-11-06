import { type DrawingItem, type HistoryAction } from "~/app/(protected)/atoms"
import { useAtom } from "jotai"
import { documentSketchesAtom } from "~/app/(protected)/atoms"
import { type Dimension } from "~/app/_components/sketch/_components/sketch-controls"
import { useCallback } from "react"

// Custom hook for document sketches
export default function useDocumentSketches(
  documentId: string,
  dimension: Dimension,
  onHistoryAction?: (action: HistoryAction) => void
) {
  const [documentSketches, setDocumentSketches] = useAtom(documentSketchesAtom(documentId))

  const addSketch = useCallback((sketch: DrawingItem) => {
    if (sketch.points.length < 2) return

    setDocumentSketches({
      ...documentSketches,
      [dimension]: [...documentSketches[dimension], sketch]
    })

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
  }, [documentSketches, dimension, setDocumentSketches, onHistoryAction])

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