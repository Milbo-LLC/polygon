'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable'
import Scene from './scene'
import HistoryPanel from './history-panel'
import HistoryControls from './history-controls'
import SketchTools from './tools/sketch-tools'
import ThreeDTools from './tools/three-d-tools'
import AppearanceTools from './tools/appearance-tools'
import { 
  Pencil, 
  Box, 
  Palette, 
  History, 
  Settings,
  FileText
} from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { useHistory } from '~/hooks/use-history'
import { cn } from '~/lib/utils'

type ToolTab = 'sketch' | '3d' | 'appearance' | 'document'

interface CadWorkspaceProps {
  userId?: string
}

export default function CadWorkspace({ userId = 'current-user' }: CadWorkspaceProps) {
  console.log('🎨 CadWorkspace is rendering! userId:', userId)
  
  const params = useParams()
  const documentId = params.documentId as string
  
  // Temporarily comment out history to see if the UI renders
  /*
  let history: any
  try {
    history = useHistory({ documentId, userId })
    console.log('✅ useHistory hook loaded successfully')
  } catch (error) {
    console.error('❌ useHistory hook failed:', error)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">
          <h2>Error loading history system</h2>
          <pre>{String(error)}</pre>
        </div>
      </div>
    )
  }
  */
  
  const [activeToolTab, setActiveToolTab] = useState<ToolTab>('sketch')
  const [showHistory, setShowHistory] = useState(false)
  const [selectedSketchId, setSelectedSketchId] = useState<string>()
  const [selectedObjectId, setSelectedObjectId] = useState<string>()
  
  // Tool callbacks
  const handleSketchToolChange = (tool: string) => {
    console.log('Sketch tool changed:', tool)
    // TODO: Update canvas tool state
  }

  const handle3DAction = (action: string, params: any) => {
    console.log('3D action:', action, params)
    // TODO: Apply 3D operations to scene
  }

  const handleAppearanceChange = (type: string, params: any) => {
    console.log('Appearance change:', type, params)
    // TODO: Update object appearance in scene
  }

  const toolTabs = [
    { id: 'sketch' as ToolTab, icon: Pencil, label: 'Sketch' },
    { id: '3d' as ToolTab, icon: Box, label: '3D' },
    { id: 'appearance' as ToolTab, icon: Palette, label: 'Appearance' },
    { id: 'document' as ToolTab, icon: FileText, label: 'Document' },
  ]

  return (
    <div className="flex h-screen w-full bg-red-500">
      <h1 className="text-white text-4xl">CadWorkspace IS RENDERING!</h1>
    </div>
  )
} 