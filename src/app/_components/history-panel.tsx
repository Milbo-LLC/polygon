'use client'

import { useState, useMemo } from 'react'
import { 
  Clock, 
  Filter, 
  Search, 
  ChevronRight, 
  User, 
  GitBranch,
  Download,
  Upload,
  Eye,
  EyeOff
} from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Badge } from '~/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { useHistory } from '~/hooks/use-history'
import { useParams } from 'next/navigation'
import { ActionType, ActionSubtype, type HistoryEntry } from '~/types/history'
import { cn } from '~/lib/utils'

// Action type colors and icons
const ACTION_CONFIG = {
  [ActionType.SKETCH]: { color: 'blue', label: 'Sketch', icon: '✏️' },
  [ActionType.THREE_D]: { color: 'purple', label: '3D', icon: '🎯' },
  [ActionType.ASSEMBLY]: { color: 'green', label: 'Assembly', icon: '🔧' },
  [ActionType.APPEARANCE]: { color: 'orange', label: 'Appearance', icon: '🎨' },
  [ActionType.ANNOTATION]: { color: 'yellow', label: 'Annotation', icon: '📝' },
  [ActionType.DOCUMENT]: { color: 'gray', label: 'Document', icon: '📄' },
}

// Subtype labels
const SUBTYPE_LABELS: Record<ActionSubtype, string> = {
  [ActionSubtype.CREATE]: 'Create',
  [ActionSubtype.MODIFY]: 'Modify',
  [ActionSubtype.DELETE]: 'Delete',
  [ActionSubtype.MOVE]: 'Move',
  [ActionSubtype.DUPLICATE]: 'Duplicate',
  [ActionSubtype.DRAW_LINE]: 'Draw Line',
  [ActionSubtype.DRAW_RECTANGLE]: 'Draw Rectangle',
  [ActionSubtype.DRAW_CIRCLE]: 'Draw Circle',
  [ActionSubtype.ADD_CONSTRAINT]: 'Add Constraint',
  [ActionSubtype.REMOVE_CONSTRAINT]: 'Remove Constraint',
  [ActionSubtype.EXTRUDE]: 'Extrude',
  [ActionSubtype.REVOLVE]: 'Revolve',
  [ActionSubtype.LOFT]: 'Loft',
  [ActionSubtype.SWEEP]: 'Sweep',
  [ActionSubtype.BOOLEAN_UNION]: 'Boolean Union',
  [ActionSubtype.BOOLEAN_SUBTRACT]: 'Boolean Subtract',
  [ActionSubtype.BOOLEAN_INTERSECT]: 'Boolean Intersect',
  [ActionSubtype.GROUP]: 'Group',
  [ActionSubtype.UNGROUP]: 'Ungroup',
  [ActionSubtype.ADD_COMPONENT]: 'Add Component',
  [ActionSubtype.REMOVE_COMPONENT]: 'Remove Component',
  [ActionSubtype.APPLY_MATERIAL]: 'Apply Material',
  [ActionSubtype.CHANGE_COLOR]: 'Change Color',
  [ActionSubtype.SET_VISIBILITY]: 'Set Visibility',
  [ActionSubtype.SET_TRANSPARENCY]: 'Set Transparency',
  [ActionSubtype.IMPORT]: 'Import',
  [ActionSubtype.EXPORT]: 'Export',
  [ActionSubtype.SETTINGS_CHANGE]: 'Settings Change',
}

export default function HistoryPanel() {
  const params = useParams()
  const documentId = params.documentId as string
  
  const history = useHistory({
    documentId,
    userId: 'current-user', // TODO: Get from auth context
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<ActionType | 'all'>('all')
  const [showDetails, setShowDetails] = useState<string | null>(null)
  const [groupByUser, setGroupByUser] = useState(false)

  const entries = history.getHistory()

  // Filter entries based on search and type
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = searchQuery === '' || 
        entry.action.subtype.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.action.targetId?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesType = filterType === 'all' || entry.action.type === filterType

      return matchesSearch && matchesType
    })
  }, [entries, searchQuery, filterType])

  // Group entries by session (continuous actions by same user)
  const groupedEntries = useMemo(() => {
    if (!groupByUser) return filteredEntries.map(e => ({ userId: e.userId, entries: [e] }))

    const groups: Array<{ userId: string; entries: HistoryEntry[] }> = []
    let currentGroup: { userId: string; entries: HistoryEntry[] } | null = null

    filteredEntries.forEach((entry) => {
      if (!currentGroup || currentGroup.userId !== entry.userId) {
        currentGroup = { userId: entry.userId, entries: [entry] }
        groups.push(currentGroup)
      } else {
        currentGroup.entries.push(entry)
      }
    })

    return groups
  }, [filteredEntries, groupByUser])

  const handleGotoVersion = (version: number) => {
    history.goto(version)
  }

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            History Timeline
          </h2>
          <Badge variant="secondary">
            v{history.currentVersion}
            {history.hasUnsavedChanges && '*'}
          </Badge>
        </div>

        {/* Search and Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={(value) => setFilterType(value as ActionType | 'all')}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(ACTION_CONFIG).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    <span className="flex items-center gap-2">
                      <span>{config.icon}</span>
                      {config.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setGroupByUser(!groupByUser)}
              className={cn(groupByUser && "bg-gray-100 dark:bg-gray-800")}
            >
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {groupedEntries.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-1">
              {groupByUser && group.entries.length > 1 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 px-2">
                  <User className="h-3 w-3" />
                  {group.userId} • {group.entries.length} actions
                </div>
              )}
              
              {group.entries.map((entry) => {
                const config = ACTION_CONFIG[entry.action.type]
                const isCurrentVersion = entry.version === history.currentVersion
                const isExpanded = showDetails === entry.id

                return (
                  <div key={entry.id}>
                    <div
                      className={cn(
                        "rounded-lg border p-3 transition-colors cursor-pointer",
                        isCurrentVersion
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      )}
                      onClick={() => setShowDetails(isExpanded ? null : entry.id)}
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isExpanded && "rotate-90"
                            )}
                          />
                          
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{config.icon}</span>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                `border-${config.color}-500 text-${config.color}-600`
                              )}
                            >
                              {SUBTYPE_LABELS[entry.action.subtype as ActionSubtype]}
                            </Badge>
                          </div>

                          <div className="text-sm">
                            {entry.action.targetId && (
                              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                                {entry.action.targetId}
                              </code>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {new Date(entry.createdAt).toLocaleTimeString()}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            v{entry.version}
                          </Badge>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 space-y-2">
                          {/* Action Details */}
                          <div className="text-sm space-y-1 pl-7">
                            <div className="text-gray-600 dark:text-gray-400">
                              <strong>User:</strong> {entry.userId}
                            </div>
                            
                            {entry.action.metadata && (
                              <div className="text-gray-600 dark:text-gray-400">
                                <strong>Metadata:</strong>
                                <pre className="text-xs mt-1 bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
                                  {JSON.stringify(entry.action.metadata, null, 2)}
                                </pre>
                              </div>
                            )}

                            {entry.action.parameters && (
                              <div className="text-gray-600 dark:text-gray-400">
                                <strong>Parameters:</strong>
                                <pre className="text-xs mt-1 bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-32">
                                  {JSON.stringify(entry.action.parameters, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pl-7">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleGotoVersion(entry.version)
                              }}
                              disabled={isCurrentVersion}
                            >
                              Go to v{entry.version}
                            </Button>
                            
                            {entry.isCheckpoint && (
                              <Badge variant="default" className="self-center">
                                Checkpoint
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {filteredEntries.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              {searchQuery || filterType !== 'all' 
                ? 'No matching history entries found'
                : 'No history entries yet'
              }
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => history.createCheckpoint()}
            className="flex-1"
          >
            <GitBranch className="h-4 w-4 mr-2" />
            Create Checkpoint
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {/* TODO: Export history */}}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {history.isSyncing && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            Syncing history...
          </div>
        )}
      </div>
    </div>
  )
} 