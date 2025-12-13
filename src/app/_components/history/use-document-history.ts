import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useRef } from 'react'
import {
  documentHistoryAtom,
  documentSketchesAtom,
  documentExtrudedShapesAtom,
  type HistoryAction,
  type HistoryStep,
  type DrawingItem,
} from '../../(protected)/atoms'

export default function useDocumentHistory(documentId: string) {
  const [history, setHistory] = useAtom(documentHistoryAtom(documentId))
  const sketches = useAtomValue(documentSketchesAtom(documentId))
  const setSketches = useSetAtom(documentSketchesAtom(documentId))
  const extrudedShapes = useAtomValue(documentExtrudedShapesAtom(documentId))
  const setExtrudedShapes = useSetAtom(documentExtrudedShapesAtom(documentId))

  // Use refs to get latest values without causing re-renders
  const historyRef = useRef(history)
  const sketchesRef = useRef(sketches)
  const extrudedShapesRef = useRef(extrudedShapes)

  historyRef.current = history
  sketchesRef.current = sketches
  extrudedShapesRef.current = extrudedShapes

  // Add a new history step - stable callback that doesn't recreate
  const addHistoryStep = useCallback((action: HistoryAction) => {
    const currentHistory = historyRef.current
    const currentSketches = sketchesRef.current
    const currentExtrudedShapes = extrudedShapesRef.current

    const newStep: HistoryStep = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      action,
      state: {
        sketches: { ...currentSketches },
        extrudedShapes: [...currentExtrudedShapes]
      }
    }

    // If we're not at the end of history, truncate future steps
    const newSteps = currentHistory.steps.slice(0, currentHistory.currentStepIndex + 1)
    newSteps.push(newStep)

    setHistory({
      steps: newSteps,
      currentStepIndex: newSteps.length - 1
    })
  }, [setHistory])

  // Navigate to a specific history step
  const goToStep = useCallback((stepIndex: number) => {
    const currentHistory = historyRef.current
    if (stepIndex < 0 || stepIndex >= currentHistory.steps.length) return

    const step = currentHistory.steps[stepIndex]
    if (!step) return

    // Restore the state from that step
    setSketches(step.state.sketches as Record<'x' | 'y' | 'z', DrawingItem[]>)
    setExtrudedShapes(step.state.extrudedShapes)

    setHistory({
      ...currentHistory,
      currentStepIndex: stepIndex
    })
  }, [setSketches, setExtrudedShapes, setHistory])

  // Go back one step
  const goBack = useCallback(() => {
    const currentHistory = historyRef.current
    if (currentHistory.currentStepIndex > 0) {
      goToStep(currentHistory.currentStepIndex - 1)
    }
  }, [goToStep])

  // Go forward one step
  const goForward = useCallback(() => {
    const currentHistory = historyRef.current
    if (currentHistory.currentStepIndex < currentHistory.steps.length - 1) {
      goToStep(currentHistory.currentStepIndex + 1)
    }
  }, [goToStep])

  return {
    history,
    currentStep: history.steps[history.currentStepIndex],
    currentStepIndex: history.currentStepIndex,
    canGoBack: history.currentStepIndex > 0,
    canGoForward: history.currentStepIndex < history.steps.length - 1,
    addHistoryStep,
    goToStep,
    goBack,
    goForward
  }
}
