import { useCallback } from 'react'
import { useKeyboardShortcut } from '~/hooks/use-keyboard-shortcuts'

export function useSketchShortcuts({
  isActive,
  isSketching,
  onCancel,
  onUndo
}: {
  isActive: boolean
  isSketching: boolean
  onCancel: () => void
  onUndo: () => void
}) {
  const handleCancelSketching = useCallback(() => {
    if (isSketching) {
      onCancel()
    }
  }, [isSketching, onCancel])

  useKeyboardShortcut([
    {
      key: 'Escape',
      disabled: !isActive,
      callback: handleCancelSketching
    },
    {
      key: 'z',
      ctrlKey: true,
      disabled: !isActive,
      preventDefault: true,
      callback: onUndo
    },
    {
      key: 'z',
      metaKey: true,
      disabled: !isActive,
      preventDefault: true,
      callback: onUndo
    }
  ])
}