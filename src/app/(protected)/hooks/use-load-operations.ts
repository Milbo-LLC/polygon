import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { api } from '~/trpc/react';
import { documentOperationsAtom, isUsingDatabaseAtom } from '../atoms/operations-atoms';

/**
 * Load operations from database on mount
 *
 * Usage: Call this hook at the document level (e.g., in the page component)
 */
export function useLoadOperations(documentId: string) {
  const setOperations = useSetAtom(documentOperationsAtom(documentId));
  const setIsUsingDatabase = useSetAtom(isUsingDatabaseAtom(documentId));

  const { data: operations, isLoading, error } = api.operations.getByDocument.useQuery(
    { documentId },
    {
      // Only fetch once on mount
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (operations) {
      console.log('[LoadOperations] Loaded', operations.length, 'operations from database');
      setOperations(operations as any); // Type conversion needed due to Prisma JSON types
      setIsUsingDatabase(operations.length > 0);
    }
  }, [operations, setOperations, setIsUsingDatabase]);

  return {
    isLoading,
    error,
    operationCount: operations?.length ?? 0,
  };
}
