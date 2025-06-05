'use client'

import { Undo2, Redo2, Save, GitBranch } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'
import { useHistory } from '~/hooks/use-history'
import { useParams } from 'next/navigation'

export default function HistoryControls() {
  const params = useParams()
  const documentId = params.documentId as string
  
  const history = useHistory({
    documentId,
    userId: 'current-user', // TODO: Get from auth context
  })

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-2 shadow-lg">
      <TooltipProvider>
        {/* Undo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => history.undo()}
              disabled={!history.canUndo}
              className="h-8 w-8"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Undo (Ctrl+Z)</p>
          </TooltipContent>
        </Tooltip>

        {/* Redo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => history.redo()}
              disabled={!history.canRedo}
              className="h-8 w-8"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Redo (Ctrl+Y)</p>
          </TooltipContent>
        </Tooltip>

        <div className="mx-2 h-4 w-px bg-gray-300 dark:bg-gray-700" />

        {/* Save Checkpoint */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => history.createCheckpoint()}
              className="h-8 w-8"
            >
              <Save className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Create Checkpoint</p>
          </TooltipContent>
        </Tooltip>

        {/* Version Info */}
        <div className="ml-2 flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <span>v{history.currentVersion}</span>
          {history.hasUnsavedChanges && (
            <span className="text-amber-600 dark:text-amber-400">*</span>
          )}
        </div>

        {/* Sync Status */}
        {history.isSyncing && (
          <div className="ml-2 flex items-center gap-1">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            <span className="text-xs text-gray-500">Syncing...</span>
          </div>
        )}
      </TooltipProvider>
    </div>
  )
}

// History Timeline Component
export function HistoryTimeline() {
  const params = useParams()
  const documentId = params.documentId as string
  
  const history = useHistory({
    documentId,
    userId: 'current-user',
  })

  const entries = history.getHistory()

  return (
    <div className="absolute right-4 top-4 z-10 h-96 w-64 overflow-hidden rounded-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-lg">
      <div className="border-b border-gray-200 dark:border-gray-700 p-3">
        <h3 className="font-semibold">History Timeline</h3>
      </div>
      <div className="overflow-y-auto p-3">
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`rounded p-2 text-sm ${
                entry.version === history.currentVersion
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : 'bg-gray-50 dark:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">v{entry.version}</span>
                <span className="text-xs text-gray-500">
                  {new Date(entry.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {entry.action.type} - {entry.action.subtype}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 