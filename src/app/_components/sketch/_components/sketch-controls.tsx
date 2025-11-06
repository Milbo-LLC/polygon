import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Button } from "~/components/ui/button"
import { useAtom, useAtomValue } from "jotai"
import { canvasStateAtom, sketchStateAtom } from "../../../(protected)/atoms"

export type Dimension = 'x' | 'y' | 'z'
export type Tool = 'pencil' | 'rectangle' | 'eraser' | 'select'

export default function SketchControls() {
  const canvasState = useAtomValue(canvasStateAtom)
  const [sketchState, setSketchState] = useAtom(sketchStateAtom)
  const isSketchModeActive = canvasState.selectedTool === 'sketch'

  const handleToolChange = (value: string) => {
    const sketchTool = value as Tool
    setSketchState({
      ...sketchState,
      selectedTool: sketchTool
    })
  }

  const handleClearAll = () => {
    if (confirm('Clear all sketches on this plane?')) {
      // This will be handled by the parent component
      window.dispatchEvent(new CustomEvent('clearSketches'))
    }
  }

  return (
    <div className="absolute top-10 left-10 z-10 flex flex-col gap-2 bg-background/80 p-4 rounded-lg backdrop-blur-sm">
      {isSketchModeActive && sketchState.dimension && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm">Tool:</span>
            <Select value={sketchState.selectedTool} onValueChange={handleToolChange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select Tool" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pencil">Pencil</SelectItem>
                <SelectItem value="rectangle">Rectangle</SelectItem>
                <SelectItem value="eraser">Eraser</SelectItem>
                <SelectItem value="select">Select</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="text-xs"
          >
            Clear All
          </Button>
        </>
      )}
    </div>
  )
} 