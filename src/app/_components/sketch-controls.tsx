import { Button } from "~/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { useEffect } from "react"

export type Dimension = 'x' | 'y' | 'z'
export type Tool = 'pencil' | 'rectangle'

interface SketchControlsProps {
  onDimensionChange: (dimension: Dimension) => void
  onToolChange: (tool: Tool) => void
  onToggleSketchMode: () => void
  isSketchModeActive: boolean
  selectedDimension: Dimension
}

export default function SketchControls({
  onDimensionChange,
  onToolChange,
  onToggleSketchMode,
  isSketchModeActive,
  selectedDimension
}: SketchControlsProps) {
  const handleDimensionChange = (value: string) => {
    onDimensionChange(value as Dimension)
  }

  const handleToolChange = (value: string) => {
    onToolChange(value as Tool)
  }

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-background/80 p-4 rounded-lg backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <Button
          onClick={onToggleSketchMode}
          variant={isSketchModeActive ? "destructive" : "default"}
          size="sm"
        >
          {isSketchModeActive ? "Exit Sketch Mode" : "Enter Sketch Mode"}
        </Button>
      </div>

      {isSketchModeActive && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm">Dimension:</span>
            <Select value={selectedDimension} onValueChange={handleDimensionChange}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Select Dimension" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="x">X</SelectItem>
                <SelectItem value="y">Y</SelectItem>
                <SelectItem value="z">Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

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