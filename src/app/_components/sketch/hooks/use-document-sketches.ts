import { type DrawingItem } from "~/app/(protected)/atoms"
import { useAtom } from "jotai"
import { documentSketchesAtom } from "~/app/(protected)/atoms"
import { type Dimension } from "~/app/_components/sketch-controls"
import { useCallback } from "react"

// Custom hook for document sketches
export default function useDocumentSketches(documentId: string, dimension: Dimension) {
  const [documentSketches, setDocumentSketches] = useAtom(documentSketchesAtom(documentId))

  const addSketch = useCallback((sketch: DrawingItem) => {
    if (sketch.points.length < 2) return

      setDocumentSketches({
      ...documentSketches,
      [dimension]: [...documentSketches[dimension], sketch]
    })
  }, [documentSketches, dimension, setDocumentSketches])

  const undoLastSketch = useCallback(() => {
    setDocumentSketches({
      ...documentSketches,
      [dimension]: documentSketches[dimension].slice(0, -1)
    })
  }, [documentSketches, dimension, setDocumentSketches])

  return {
    sketches: documentSketches[dimension],
    addSketch,
    undoLastSketch
  }
}