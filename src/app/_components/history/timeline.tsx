import { useParams } from 'next/navigation'
import { Button } from '~/components/ui/button'
import { ChevronLeft, ChevronRight, PencilIcon, BoxIcon, EraserIcon, Trash2Icon } from 'lucide-react'
import useDocumentHistory from './use-document-history'

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const actionIcons = {
  create_sketch: PencilIcon,
  delete_sketch: EraserIcon,
  clear_sketches: Trash2Icon,
  extrude: BoxIcon,
  undo_sketch: ChevronLeft,
}

const actionColors = {
  create_sketch: 'text-green-600',
  delete_sketch: 'text-red-600',
  clear_sketches: 'text-red-600',
  extrude: 'text-blue-600',
  undo_sketch: 'text-yellow-600',
}

export default function Timeline() {
  const params = useParams()
  const documentId = params.documentId as string | undefined
  
  // Don't render if documentId is not available
  if (!documentId) {
    return null
  }
  
  const { history, currentStepIndex, canGoBack, canGoForward, goToStep, goBack, goForward } = useDocumentHistory(documentId)
  
  return (
    <div className="absolute top-4 right-4 z-50 w-80 flex flex-col gap-2 bg-background/95 p-4 rounded-lg backdrop-blur-sm border border-border shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">History</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={goBack}
            disabled={!canGoBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={goForward}
            disabled={!canGoForward}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="h-[400px] overflow-y-auto pr-2">
        <div className="flex flex-col gap-1">
          {history.steps.map((step, index) => {
            const Icon = actionIcons[step.action.type]
            const colorClass = actionColors[step.action.type]
            const isCurrentStep = index === currentStepIndex
            const isFutureStep = index > currentStepIndex

            return (
              <button
                key={step.id}
                onClick={() => goToStep(index)}
                className={`
                  flex items-start gap-3 p-3 rounded-md text-left transition-all
                  ${isCurrentStep
                    ? 'bg-primary/10 border-2 border-primary'
                    : isFutureStep
                    ? 'bg-muted/30 opacity-50'
                    : 'bg-muted/50 hover:bg-muted'
                  }
                `}
              >
                <div className={`mt-0.5 ${isCurrentStep ? 'text-primary' : colorClass}`}>
                  {Icon && <Icon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {step.action.description}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatTimeAgo(step.timestamp)}
                  </div>
                  {step.action.metadata.dimension && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Plane: {step.action.metadata.dimension.toUpperCase()}
                    </div>
                  )}
                  {step.action.metadata.depth && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Depth: {step.action.metadata.depth}
                    </div>
                  )}
                </div>
                {isCurrentStep && (
                  <div className="text-xs font-semibold text-primary mt-1">
                    Current
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center pt-2 border-t">
        Step {currentStepIndex + 1} of {history.steps.length}
      </div>
    </div>
  )
}
