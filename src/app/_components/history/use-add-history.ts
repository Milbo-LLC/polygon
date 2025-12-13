import { useSetAtom } from 'jotai'
import { useAtomCallback } from 'jotai/utils'
import { useCallback } from 'react'
import {
  documentHistoryAtom,
  documentSketchesAtom,
  documentExtrudedShapesAtom,
  type HistoryAction,
  type HistoryStep,
} from '../../(protected)/atoms'

/**
 * Lightweight hook that ONLY provides addHistoryStep without subscribing to any state.
 * Use this in components that need to record history but don't need to read it.
 */
export default function useAddHistory(documentId: string) {
  const setHistory = useSetAtom(documentHistoryAtom(documentId))

  // Use atomCallback to read atom values without subscribing
  const addHistoryStep = useAtomCallback(
    useCallback((get, _set, action: HistoryAction) => {
      const currentHistory = get(documentHistoryAtom(documentId))
      const currentSketches = get(documentSketchesAtom(documentId))
      const currentExtrudedShapes = get(documentExtrudedShapesAtom(documentId))

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
    }, [documentId, setHistory])
  )

  return { addHistoryStep }
}
