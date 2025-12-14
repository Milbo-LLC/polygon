'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import {
  migrateDocumentToOperations,
  hasLocalStorageData,
  clearLocalStorageData,
} from '~/lib/migration/localStorage-to-operations';
import { useSetAtom } from 'jotai';
import { documentOperationsAtom, isUsingDatabaseAtom } from '~/app/(protected)/atoms/operations-atoms';

interface MigrateDialogProps {
  documentId: string;
  onClose: () => void;
}

export function MigrateDialog({ documentId, onClose }: MigrateDialogProps) {
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createBatch = api.operations.createBatch.useMutation();
  const setOperations = useSetAtom(documentOperationsAtom(documentId));
  const setIsUsingDatabase = useSetAtom(isUsingDatabaseAtom(documentId));

  async function handleMigrate() {
    setMigrating(true);
    setError(null);

    try {
      // Convert localStorage to operations
      console.log('[Migration] Converting localStorage data to operations...');
      const operations = await migrateDocumentToOperations(documentId);

      if (operations.length === 0) {
        setError('No data found in localStorage to migrate');
        setMigrating(false);
        return;
      }

      console.log('[Migration] Found', operations.length, 'operations to migrate');

      // Upload to database
      const savedOperations = await createBatch.mutateAsync({
        documentId,
        operations: operations.map((op) => ({
          type: op.type,
          parameters: op.parameters,
          dependencies: op.dependencies,
        })),
      });

      console.log('[Migration] Successfully saved', savedOperations.length, 'operations to database');

      // Update atoms
      setOperations(savedOperations as any);
      setIsUsingDatabase(true);

      // Clear localStorage after successful migration
      clearLocalStorageData(documentId);

      // Close dialog
      onClose();
    } catch (err) {
      console.error('[Migration] Migration failed:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Migration failed. Your localStorage data is still safe.'
      );
    } finally {
      setMigrating(false);
    }
  }

  function handleSkip() {
    // User chose to skip migration - use database mode without migrating
    setIsUsingDatabase(true);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-xl font-bold mb-4">Migrate to Database</h2>

        <p className="mb-4 text-gray-700 dark:text-gray-300">
          We found existing CAD data in your browser's local storage. Would you like to migrate it
          to the cloud database?
        </p>

        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Benefits of migrating:</strong>
            <br />
            • Access your work from any device
            <br />
            • Automatic cloud backup
            <br />
            • Better performance with complex models
            <br />• Enables export features (STL, STEP, JSON)
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            {migrating ? 'Migrating...' : 'Migrate Now'}
          </button>
          <button
            onClick={handleSkip}
            disabled={migrating}
            className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded transition-colors"
          >
            Skip
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Your localStorage data will remain safe until you choose to migrate. You can migrate
          later from the document settings.
        </p>
      </div>
    </div>
  );
}

/**
 * Hook to check if migration dialog should be shown
 */
export function useMigrationCheck(documentId: string) {
  const [showDialog, setShowDialog] = useState(false);

  // Check on mount if we should show migration dialog
  useState(() => {
    // Only check if we're in browser
    if (typeof window === 'undefined') return;

    const hasLocalData = hasLocalStorageData(documentId);
    if (hasLocalData) {
      setShowDialog(true);
    }
  });

  return {
    showMigrationDialog: showDialog,
    closeMigrationDialog: () => setShowDialog(false),
  };
}
