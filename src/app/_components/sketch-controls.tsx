import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { useAtom, useAtomValue } from "jotai"
import { canvasStateAtom, sketchStateAtom } from "../(protected)/atoms"

export type Dimension = 'x' | 'y' | 'z'
export type Tool = 'pencil' | 'rectangle'

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

  return (
    <div className="absolute top-10 left-10 z-10 flex flex-col gap-2 bg-background/80 p-4 rounded-lg backdrop-blur-sm">
      {isSketchModeActive && sketchState.dimension && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm">Tool:</span>
            <Select defaultValue="pencil" onValueChange={handleToolChange}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Select Tool" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pencil">Pencil</SelectItem>
                <SelectItem value="rectangle">Rectangle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  )
} 