'use client'

import { useState } from 'react'
import { 
  Palette,
  Eye,
  EyeOff,
  Sparkles,
  Droplet,
  Sun,
  Moon,
  Brush
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Input } from '~/components/ui/input'
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
import { ActionType, ActionSubtype } from '~/types/history'
import { cn } from '~/lib/utils'

interface AppearanceToolsProps {
  documentId: string
  userId: string
  selectedObjectId?: string
  onAppearanceChange?: (type: string, params: any) => void
}

type Material = 'plastic' | 'metal' | 'wood' | 'glass' | 'rubber' | 'concrete'

const MATERIALS: Record<Material, { label: string; properties: any }> = {
  plastic: {
    label: 'Plastic',
    properties: { roughness: 0.5, metalness: 0, clearcoat: 0.1 }
  },
  metal: {
    label: 'Metal',
    properties: { roughness: 0.2, metalness: 1, clearcoat: 0 }
  },
  wood: {
    label: 'Wood',
    properties: { roughness: 0.8, metalness: 0, clearcoat: 0.05 }
  },
  glass: {
    label: 'Glass',
    properties: { roughness: 0, metalness: 0, transmission: 1, ior: 1.5 }
  },
  rubber: {
    label: 'Rubber',
    properties: { roughness: 0.9, metalness: 0, clearcoat: 0 }
  },
  concrete: {
    label: 'Concrete',
    properties: { roughness: 1, metalness: 0, clearcoat: 0 }
  }
}

export default function AppearanceTools({ 
  documentId, 
  userId, 
  selectedObjectId,
  onAppearanceChange 
}: AppearanceToolsProps) {
  const history = useHistory({ documentId, userId })
  const [selectedColor, setSelectedColor] = useState('#ff6b6b')
  const [selectedMaterial, setSelectedMaterial] = useState<Material>('plastic')
  const [opacity, setOpacity] = useState(100)
  const [isVisible, setIsVisible] = useState(true)
  const [emissiveIntensity, setEmissiveIntensity] = useState(0)

  const colors = [
    '#ff6b6b', // Red
    '#4ecdc4', // Teal
    '#45b7d1', // Blue
    '#96ceb4', // Green
    '#feca57', // Yellow
    '#dfe4ea', // Gray
    '#5f27cd', // Purple
    '#ff9ff3', // Pink
  ]

  const handleColorChange = (color: string) => {
    if (!selectedObjectId) return

    setSelectedColor(color)
    history.recordAction({
      type: ActionType.APPEARANCE,
      subtype: ActionSubtype.CHANGE_COLOR,
      targetId: selectedObjectId,
      parameters: { color },
    })
    onAppearanceChange?.('color', { color })
  }

  const handleMaterialChange = (material: Material) => {
    if (!selectedObjectId) return

    setSelectedMaterial(material)
    history.recordAction({
      type: ActionType.APPEARANCE,
      subtype: ActionSubtype.APPLY_MATERIAL,
      targetId: selectedObjectId,
      parameters: { 
        material,
        properties: MATERIALS[material].properties 
      },
    })
    onAppearanceChange?.('material', { material, properties: MATERIALS[material].properties })
  }

  const handleTransparencyChange = (value: number) => {
    if (!selectedObjectId) return

    setOpacity(value)
    history.recordAction({
      type: ActionType.APPEARANCE,
      subtype: ActionSubtype.SET_TRANSPARENCY,
      targetId: selectedObjectId,
      parameters: { opacity: value / 100 },
    })
    onAppearanceChange?.('transparency', { opacity: value / 100 })
  }

  const handleVisibilityToggle = () => {
    if (!selectedObjectId) return

    const newVisibility = !isVisible
    setIsVisible(newVisibility)
    history.recordAction({
      type: ActionType.APPEARANCE,
      subtype: ActionSubtype.SET_VISIBILITY,
      targetId: selectedObjectId,
      parameters: { visible: newVisibility },
    })
    onAppearanceChange?.('visibility', { visible: newVisibility })
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      <TooltipProvider>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </h3>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {!selectedObjectId && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              Select an object to modify its appearance
            </div>
          )}

          {selectedObjectId && (
            <>
              {/* Visibility */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Visibility</Label>
                <Button
                  variant={isVisible ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleVisibilityToggle}
                  className="w-full justify-start"
                >
                  {isVisible ? (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Visible
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hidden
                    </>
                  )}
                </Button>
              </div>

              <Separator />

              {/* Color */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Color</Label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
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
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="h-8"
                />
              </div>

              <Separator />

              {/* Material */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Material</Label>
                <Select 
                  value={selectedMaterial} 
                  onValueChange={(v) => handleMaterialChange(v as Material)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MATERIALS).map(([key, material]) => (
                      <SelectItem key={key} value={key}>
                        {material.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Transparency */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Opacity: {opacity}%
                </Label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={opacity}
                  onChange={(e) => handleTransparencyChange(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <Separator />

              {/* Emissive */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Emissive Intensity: {emissiveIntensity}
                </Label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={emissiveIntensity}
                  onChange={(e) => setEmissiveIntensity(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <Separator />

              {/* Quick Presets */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Quick Presets</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleMaterialChange('metal')
                      handleColorChange('#c0c0c0')
                    }}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Chrome
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleMaterialChange('plastic')
                      handleColorChange('#ffffff')
                    }}
                  >
                    <Sun className="h-4 w-4 mr-2" />
                    White Plastic
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleMaterialChange('glass')
                      handleTransparencyChange(20)
                    }}
                  >
                    <Droplet className="h-4 w-4 mr-2" />
                    Glass
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleMaterialChange('wood')
                      handleColorChange('#8b4513')
                    }}
                  >
                    <Brush className="h-4 w-4 mr-2" />
                    Wood
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Status Bar */}
        <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              {selectedObjectId ? `Object: ${selectedObjectId}` : 'No object selected'}
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