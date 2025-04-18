import { Button } from "~/components/ui/button"
import { PencilRulerIcon } from "lucide-react"
import { useAtom } from "jotai"
import { canvasStateAtom } from "../(protected)/atoms"
import SketchControls from "./sketch/_components/sketch-controls"
import { Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip"

export default function ControlPanel() {
  const [canvasState, setCanvasState] = useAtom(canvasStateAtom)

  const toggleSketchMode = () => {
    setCanvasState({
      ...canvasState,
      selectedTool: canvasState.selectedTool === 'sketch' ? null : 'sketch'
    })
  }

  const tools = [
    {
      name: 'sketch',
      icon: <PencilRulerIcon />,
      onClick: toggleSketchMode,
      component: <SketchControls />,
      tooltip: 'Sketch - Draw lines and shapes'
    },
  ]

  

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-background/80 p-1 rounded-lg backdrop-blur-sm border border-border">
      {tools.map((tool) => {
        const isSelected = canvasState.selectedTool === tool.name
        return (
          <div key={tool.name}>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={tool.onClick}>
                  {tool.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="my-2" align="start">
                {tool.tooltip}
              </TooltipContent>
            </Tooltip>
            {isSelected && tool.component}
          </div>
        )
      })}
    </div>
  )
}