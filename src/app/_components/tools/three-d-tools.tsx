'use client'

import { useState } from 'react'
import { 
  Box,
  Cylinder,
  Layers,
  ArrowUpFromLine,
  RotateCw,
  Combine,
  Minus,
  Circle,
  Shapes
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Input } from '~/components/ui/input'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { Separator } from '~/components/ui/separator'
import { Badge } from '~/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { useHistory } from '~/hooks/use-history'
import { ActionSubtype } from '~/types/history'
import { cn } from '~/lib/utils'

interface ThreeDToolsProps {
  documentId: string
  userId: string
  selectedSketchId?: string
  onToolAction?: (action: string, params: any) => void
}

type ExtrudeDirection = 'positive' | 'negative' | 'both'

export default function ThreeDTools({ 
  documentId, 
  userId, 
  selectedSketchId,
  onToolAction 
}: ThreeDToolsProps) {
  const history = useHistory({ documentId, userId })
  const [extrudeDistance, setExtrudeDistance] = useState(50)
  const [extrudeDirection, setExtrudeDirection] = useState<ExtrudeDirection>('positive')
  const [revolveAngle, setRevolveAngle] = useState(360)
  const [selectedObjects, setSelectedObjects] = useState<string[]>([])

  const tools = [
    { 
      id: 'extrude', 
      icon: ArrowUpFromLine, 
      label: 'Extrude', 
      action: ActionSubtype.EXTRUDE,
      requiresSketch: true 
    },
    { 
      id: 'revolve', 
      icon: RotateCw, 
      label: 'Revolve', 
      action: ActionSubtype.REVOLVE,
      requiresSketch: true 
    },
    { 
      id: 'loft', 
      icon: Layers, 
      label: 'Loft', 
      action: ActionSubtype.LOFT,
      requiresSketch: true 
    },
    { 
      id: 'sweep', 
      icon: Shapes, 
      label: 'Sweep', 
      action: ActionSubtype.SWEEP,
      requiresSketch: true 
    },
  ]

  const booleanOps = [
    { 
      id: 'union', 
      icon: Combine, 
      label: 'Union', 
      action: ActionSubtype.BOOLEAN_UNION,
      requiresMultiple: true 
    },
    { 
      id: 'subtract', 
      icon: Minus, 
      label: 'Subtract', 
      action: ActionSubtype.BOOLEAN_SUBTRACT,
      requiresMultiple: true 
    },
    { 
      id: 'intersect', 
      icon: Circle, 
      label: 'Intersect', 
      action: ActionSubtype.BOOLEAN_INTERSECT,
      requiresMultiple: true 
    },
  ]

  const handleExtrude = () => {
    if (!selectedSketchId) return

    const id = `extrude-${Date.now()}`
    history.record3DAction(
      ActionSubtype.EXTRUDE,
      id,
      {
        sketchId: selectedSketchId,
        distance: extrudeDistance,
        direction: extrudeDirection,
      }
    )
    onToolAction?.('extrude', { id, sketchId: selectedSketchId, distance: extrudeDistance, direction: extrudeDirection })
  }

  const handleRevolve = () => {
    if (!selectedSketchId) return

    const id = `revolve-${Date.now()}`
    history.record3DAction(
      ActionSubtype.REVOLVE,
      id,
      {
        sketchId: selectedSketchId,
        angle: revolveAngle,
        axis: { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 1, z: 0 } },
      }
    )
    onToolAction?.('revolve', { id, sketchId: selectedSketchId, angle: revolveAngle })
  }

  const handleBooleanOp = (operation: ActionSubtype) => {
    if (selectedObjects.length < 2) return

    const id = `boolean-${Date.now()}`
    const params = operation === ActionSubtype.BOOLEAN_SUBTRACT
      ? { targetId: selectedObjects[0], toolIds: selectedObjects.slice(1) }
      : { targetIds: selectedObjects }

    history.record3DAction(operation, id, params)
    onToolAction?.('boolean', { id, operation, ...params })
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      <TooltipProvider>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Box className="h-5 w-5" />
            3D Tools
          </h3>
        </div>

        {/* 3D Operations */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Main Tools */}
          <div>
            <Label className="text-sm font-medium mb-2 block">3D Operations</Label>
            <div className="grid grid-cols-2 gap-2">
              {tools.map((tool) => {
                const Icon = tool.icon
                const disabled = tool.requiresSketch && !selectedSketchId
                return (
                  <Tooltip key={tool.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        onClick={() => {
                          if (tool.id === 'extrude') handleExtrude()
                          else if (tool.id === 'revolve') handleRevolve()
                          // TODO: Implement other tools
                        }}
                        className="justify-start"
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {tool.label}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{disabled ? 'Select a sketch first' : tool.label}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>

          <Separator />

          {/* Extrude Settings */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Extrude Settings</Label>
            
            <div>
              <Label className="text-xs text-gray-600 dark:text-gray-400">
                Distance: {extrudeDistance}mm
              </Label>
              <input
                type="range"
                min="1"
                max="200"
                value={extrudeDistance}
                onChange={(e) => setExtrudeDistance(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <RadioGroup value={extrudeDirection} onValueChange={(v) => setExtrudeDirection(v as ExtrudeDirection)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="positive" id="positive" />
                <Label htmlFor="positive" className="text-sm">Positive</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="negative" id="negative" />
                <Label htmlFor="negative" className="text-sm">Negative</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="text-sm">Both</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Revolve Settings */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Revolve Settings</Label>
            
            <div>
              <Label className="text-xs text-gray-600 dark:text-gray-400">
                Angle: {revolveAngle}°
              </Label>
              <input
                type="range"
                min="1"
                max="360"
                value={revolveAngle}
                onChange={(e) => setRevolveAngle(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <Select defaultValue="y">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select axis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="x">X Axis</SelectItem>
                <SelectItem value="y">Y Axis</SelectItem>
                <SelectItem value="z">Z Axis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Boolean Operations */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Boolean Operations</Label>
            <div className="space-y-2">
              {booleanOps.map((op) => {
                const Icon = op.icon
                const disabled = op.requiresMultiple && selectedObjects.length < 2
                return (
                  <Tooltip key={op.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        onClick={() => handleBooleanOp(op.action)}
                        className="w-full justify-start"
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {op.label}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{disabled ? 'Select at least 2 objects' : op.label}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
            {selectedObjects.length > 0 && (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                {selectedObjects.length} object{selectedObjects.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              {selectedSketchId ? `Sketch: ${selectedSketchId}` : 'No sketch selected'}
            </span>
            <Badge variant="secondary" className="text-xs">
              v{history.currentVersion}
            </Badge>
          </div>
        </div>
      </TooltipProvider>
    </div>
  )
} 