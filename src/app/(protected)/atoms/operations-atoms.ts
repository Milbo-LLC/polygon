import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import type { Operation } from '~/types/operations';
import type { DrawingItem, ExtrudedShape, Point3D } from './index';
import type { Dimension } from '~/app/_components/sketch/_components/sketch-controls';

/**
 * Operations loaded from database
 * This is the source of truth for all CAD data
 */
export const documentOperationsAtom = atomFamily((documentId: string) =>
  atom<Operation[]>([])
);

/**
 * Pending operations not yet saved to database
 * Used for optimistic updates during drawing
 */
export const documentPendingOperationsAtom = atomFamily((documentId: string) =>
  atom<Operation[]>([])
);

/**
 * Combined operations (saved + pending)
 */
export const documentAllOperationsAtom = atomFamily((documentId: string) =>
  atom((get) => {
    const saved = get(documentOperationsAtom(documentId));
    const pending = get(documentPendingOperationsAtom(documentId));
    return [...saved, ...pending];
  })
);

/**
 * Derived atom: Convert operations to DrawingItem format for backward compatibility
 * This allows existing components to work without changes
 */
export const documentSketchesFromOperationsAtom = atomFamily((documentId: string) =>
  atom((get) => {
    const operations = get(documentAllOperationsAtom(documentId));

    const sketches: Record<Dimension, DrawingItem[]> = { x: [], y: [], z: [] };

    for (const op of operations) {
      if (op.type === 'sketch_line' && 'dimension' in op.parameters) {
        const params = op.parameters as {
          dimension: Dimension;
          points: Point3D[];
          color: string;
          closed: boolean;
        };
        sketches[params.dimension].push({
          id: op.id,
          tool: 'pencil',
          color: params.color,
          points: params.points,
          dimension: params.dimension,
        });
      } else if (op.type === 'sketch_rectangle' && 'dimension' in op.parameters) {
        const params = op.parameters as {
          dimension: Dimension;
          startPoint: Point3D;
          endPoint: Point3D;
          color: string;
        };
        sketches[params.dimension].push({
          id: op.id,
          tool: 'rectangle',
          color: params.color,
          points: [params.startPoint, params.endPoint],
          dimension: params.dimension,
        });
      } else if (op.type === 'sketch_circle' && 'dimension' in op.parameters) {
        const params = op.parameters as {
          dimension: Dimension;
          center: Point3D;
          radius: number;
          color: string;
        };
        // Convert circle to drawing item (represented as center point for now)
        sketches[params.dimension].push({
          id: op.id,
          tool: 'pencil', // Will update when circle tool is added
          color: params.color,
          points: [params.center],
          dimension: params.dimension,
        });
      }
    }

    return sketches;
  })
);

/**
 * Derived atom: Convert extrude operations to ExtrudedShape format
 */
export const documentExtrudedShapesFromOperationsAtom = atomFamily((documentId: string) =>
  atom((get) => {
    const operations = get(documentAllOperationsAtom(documentId));

    return operations
      .filter((op) => op.type === 'extrude')
      .map((op) => {
        const params = op.parameters as {
          sketchOperationId: string;
          depth: number;
          direction: string;
          color?: string;
        };

        // Find the sketch operation to get its dimension
        const sketchOp = operations.find((o) => o.id === params.sketchOperationId);
        const dimension = (
          sketchOp?.parameters as { dimension?: Dimension }
        )?.dimension ?? 'z';

        return {
          id: op.id,
          sketchId: params.sketchOperationId,
          dimension,
          depth: params.depth,
          color: params.color ?? '#cccccc',
        } satisfies ExtrudedShape;
      });
  })
);

/**
 * Flag to track if we're using database mode
 */
export const isUsingDatabaseAtom = atomFamily((documentId: string) =>
  atom(false)
);
