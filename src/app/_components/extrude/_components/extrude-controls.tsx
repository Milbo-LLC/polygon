import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { useAtom, useAtomValue } from "jotai"
import { canvasStateAtom, extrudeStateAtom, documentExtrudedShapesAtom, documentSketchesAtom } from "../../../(protected)/atoms"
import { useParams } from "next/navigation"
import useAddHistory from "../../history/use-add-history"

export default function ExtrudeControls() {
  const canvasState = useAtomValue(canvasStateAtom)
  const [extrudeState, setExtrudeState] = useAtom(extrudeStateAtom)
  const params = useParams()
  const documentId = params.documentId as string
  const [extrudedShapes, setExtrudedShapes] = useAtom(documentExtrudedShapesAtom(documentId))
  const documentSketches = useAtomValue(documentSketchesAtom(documentId))
  const { addHistoryStep } = useAddHistory(documentId)
  const isExtrudeModeActive = canvasState.selectedTool === 'extrude'

  const handleDepthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (!isNaN(value)) {
      setExtrudeState({
        ...extrudeState,
        depth: value
      })
    }
  }

  const handleExtrude = () => {
    if (!extrudeState.selectedSketchId) {
      alert('Please select a sketch first')
      return
    }

    // Find the sketch in all dimensions
    let foundSketch = null
    let foundDimension = null
    for (const dim of ['x', 'y', 'z'] as const) {
      const sketch = documentSketches[dim].find(s => s.id === extrudeState.selectedSketchId)
      if (sketch) {
        foundSketch = sketch
        foundDimension = dim
        break
      }
    }

    if (!foundSketch || !foundDimension) {
      alert('Sketch not found')
      return
    }

    // Check if this sketch is already extruded
    const alreadyExtruded = extrudedShapes.some(shape => shape.sketchId === extrudeState.selectedSketchId)
    if (alreadyExtruded) {
      alert('This sketch is already extruded')
      return
    }

    // Create the extruded shape
    const newShape = {
      id: Date.now().toString(),
      sketchId: extrudeState.selectedSketchId,
      dimension: foundDimension,
      depth: extrudeState.depth,
      color: foundSketch.color
    }

    setExtrudedShapes([...extrudedShapes, newShape])

    // Record history
    addHistoryStep({
      type: 'extrude',
      description: `Extruded ${foundSketch.tool} on ${foundDimension.toUpperCase()} plane (depth: ${extrudeState.depth})`,
      metadata: {
        sketchId: extrudeState.selectedSketchId,
        dimension: foundDimension,
        depth: extrudeState.depth
      }
    })

    // Clear selection
    setExtrudeState({
      ...extrudeState,
      selectedSketchId: null
    })
  }

  return (
    <div className="absolute top-10 left-10 z-10 flex flex-col gap-2 bg-background/80 p-4 rounded-lg backdrop-blur-sm">
      {isExtrudeModeActive && (
        <>
          <div className="text-sm mb-2">
            Click a sketch to select it for extrusion
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Depth:</span>
            <Input
              type="number"
              value={extrudeState.depth}
              onChange={handleDepthChange}
              className="w-20"
              min="0.1"
              step="0.5"
            />
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={handleExtrude}
            disabled={!extrudeState.selectedSketchId}
          >
            Extrude
          </Button>
          {extrudeState.selectedSketchId && (
            <div className="text-xs text-green-600">
              Sketch selected
            </div>
          )}
        </>
      )}
    </div>
  )
}
