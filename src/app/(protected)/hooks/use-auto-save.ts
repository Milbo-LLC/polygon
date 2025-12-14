import { useEffect, useRef } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { api } from '~/trpc/react';
import {
  documentPendingOperationsAtom,
  documentOperationsAtom,
} from '../atoms/operations-atoms';

/**
 * Debounce utility
 */
function debounce<T extends unknown[]>(
  func: (...args: T) => void | Promise<void>,
  wait: number
): (...args: T) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: T) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => void func(...args), wait);
  };
}

/**
 * Auto-save hook - saves pending operations to database with debouncing
 *
 * Usage: Call this hook at the document level (e.g., in the page component)
 */
export function useAutoSave(documentId: string) {
  const [pendingOps, setPendingOps] = useAtom(documentPendingOperationsAtom(documentId));
  const setSavedOps = useSetAtom(documentOperationsAtom(documentId));
  const createBatch = api.operations.createBatch.useMutation();
  const previousOpsRef = useRef<string>('');

  // Debounced save function (5 seconds)
  const debouncedSave = useRef(
    debounce(async (ops: typeof pendingOps) => {
      if (ops.length === 0) return;

      try {
        console.log('[AutoSave] Saving', ops.length, 'pending operations to database');

        // Save to database
        const savedOperations = await createBatch.mutateAsync({
          documentId,
          operations: ops.map((op) => ({
            type: op.type,
            parameters: op.parameters,
            dependencies: op.dependencies,
          })),
        });

        console.log('[AutoSave] Successfully saved', savedOperations.length, 'operations');

        // Update saved operations atom (cast to Operation[] since Prisma types are compatible)
        setSavedOps((prev) => [...prev, ...(savedOperations as unknown as typeof pendingOps)]);

        // Clear pending operations
        setPendingOps([]);
      } catch (error) {
        console.error('[AutoSave] Failed to save operations:', error);
        // Keep pending operations so user doesn't lose work
        // They'll be retried on next change
      }
    }, 5000)
  ).current;

  useEffect(() => {
    const opsString = JSON.stringify(pendingOps);

    // Only trigger save if pending operations changed
    if (opsString !== previousOpsRef.current && pendingOps.length > 0) {
      previousOpsRef.current = opsString;
      debouncedSave(pendingOps);
    }
  }, [pendingOps, debouncedSave]);

  // Return save status
  return {
    isSaving: createBatch.isPending,
    error: createBatch.error,
    hasPendingChanges: pendingOps.length > 0,
  };
}
