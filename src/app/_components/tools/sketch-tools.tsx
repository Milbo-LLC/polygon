'use client'

import { useState } from 'react'
import { 
  Pencil, 
  Square, 
  Circle, 
  Triangle,
  Move,
  Copy,
  Trash2,
  Ruler,
  Lock,
  Unlock
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Input } from '~/components/ui/input'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { Separator } from '~/components/ui/separator'
import { Badge } from '~/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'
import { useHistory } from '~/hooks/use-history'
import { ActionSubtype } from '~/types/history'
import { cn } from '~/lib/utils'

interface SketchToolsProps {
  documentId: string
  userId: string
  onToolChange?: (tool: string) => void
}

type SketchTool = 'pencil' | 'rectangle' | 'circle' | 'triangle' | 'move' | 'delete'
type ConstraintType = 'horizontal' | 'vertical' | 'parallel' | 'perpendicular' | 'distance'

export default function SketchTools({ documentId, userId, onToolChange }: SketchToolsProps) {
  const history = useHistory({ documentId, userId })
  const [selectedTool, setSelectedTool] = useState<SketchTool>('pencil')
  const [selectedColor, setSelectedColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(2)
  const [selectedConstraint, setSelectedConstraint] = useState<ConstraintType | null>(null)

  const tools = [
    { id: 'pencil', icon: Pencil, label: 'Draw Line', action: ActionSubtype.DRAW_LINE },
    { id: 'rectangle', icon: Square, label: 'Draw Rectangle', action: ActionSubtype.DRAW_RECTANGLE },
    { id: 'circle', icon: Circle, label: 'Draw Circle', action: ActionSubtype.DRAW_CIRCLE },
    { id: 'triangle', icon: Triangle, label: 'Draw Triangle', action: ActionSubtype.DRAW_LINE },
    { id: 'move', icon: Move, label: 'Move', action: ActionSubtype.MOVE },
    { id: 'delete', icon: Trash2, label: 'Delete', action: ActionSubtype.DELETE },
  ]

  const constraints = [
    { id: 'horizontal', icon: '━', label: 'Horizontal' },
    { id: 'vertical', icon: '┃', label: 'Vertical' },
    { id: 'parallel', icon: '∥', label: 'Parallel' },
    { id: 'perpendicular', icon: '⊥', label: 'Perpendicular' },
    { id: 'distance', icon: '↔', label: 'Distance' },
  ]

  const colors = [
    '#000000', // Black
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFFFFF', // White
  ]

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId as SketchTool)
    onToolChange?.(toolId)
  }

  const handleConstraintAdd = (constraintType: ConstraintType, targets: string[]) => {
    history.recordSketchAction(
      ActionSubtype.ADD_CONSTRAINT,
      `constraint-${Date.now()}`,
      {
        type: constraintType,
        targets,
        value: constraintType === 'distance' ? 100 : undefined,
      }
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      <TooltipProvider>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Sketch Tools
          </h3>
        </div>

        {/* Drawing Tools */}
        <div className="p-4 space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Drawing Tools</Label>
            <div className="grid grid-cols-3 gap-2">
              {tools.map((tool) => {
                const Icon = tool.icon
                return (
                  <Tooltip key={tool.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={selectedTool === tool.id ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => handleToolSelect(tool.id)}
                        className="h-10 w-10"
                      >
                        <Icon className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tool.label}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>

          <Separator />

          {/* Color Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "h-8 w-8 rounded border-2",
                    selectedColor === color
                      ? "border-blue-500"
                      : "border-gray-300 dark:border-gray-600"
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
            <Input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="mt-2 h-8"
            />
          </div>

          <Separator />

          {/* Line Width */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Line Width: {lineWidth}px
            </Label>
            <input
              type="range"
              min="1"
              max="10"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <Separator />

          {/* Constraints */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Constraints</Label>
            <div className="space-y-2">
              {constraints.map((constraint) => (
                <Button
                  key={constraint.id}
                  variant={selectedConstraint === constraint.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedConstraint(
                    selectedConstraint === constraint.id ? null : constraint.id as ConstraintType
                  )}
                  className="w-full justify-start"
                >
                  <span className="text-lg mr-2">{constraint.icon}</span>
                  {constraint.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Quick Actions */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Quick Actions</Label>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  // TODO: Implement select all
                }}
              >
                <Square className="h-4 w-4 mr-2" />
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  // TODO: Implement duplicate
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-red-600 hover:text-red-700"
                onClick={() => {
                  // TODO: Implement clear all
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Tool: {selectedTool}</span>
            <Badge variant="secondary" className="text-xs">
              v{history.currentVersion}
            </Badge>
          </div>
        </div>
      </TooltipProvider>
    </div>
  )
} 