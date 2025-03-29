import { useEffect } from 'react';

type KeyboardShortcut = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  disabled?: boolean;
  escapeKey?: boolean;
  preventDefault?: boolean;
  callback: (() => void) | undefined;
};

export function useKeyboardShortcut(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const isSpaceKey = e.key === ' ';
        const key = isSpaceKey ? 'Space' : e.key;
        const matchesKey = key === shortcut.key;
        const matchesMetaKey = shortcut.metaKey ? e.metaKey : !e.metaKey;
        const matchesCtrlKey = shortcut.ctrlKey ? e.ctrlKey : !e.ctrlKey;
        const matchesAltKey = shortcut.altKey ? e.altKey : !e.altKey;
        const matchesShiftKey = shortcut.shiftKey ? e.shiftKey : !e.shiftKey;
        const matchesEscapeKey = shortcut.escapeKey
          ? key === 'Escape'
          : key !== 'Escape';

        if (
          matchesKey &&
          matchesMetaKey &&
          matchesCtrlKey &&
          matchesAltKey &&
          matchesShiftKey &&
          matchesEscapeKey
        ) {
          if (shortcut.preventDefault && !shortcut.disabled) {
            e.preventDefault();
          }
          if (!shortcut.disabled) {
            shortcut.callback?.();
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
