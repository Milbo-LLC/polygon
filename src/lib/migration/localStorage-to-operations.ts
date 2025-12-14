import type { DrawingItem, ExtrudedShape } from "~/app/(protected)/atoms";
import type { Operation, Dimension } from "~/types/operations";

/**
 * Convert localStorage DrawingItem to SketchLineOperation or SketchRectangleOperation
 */
export function drawingItemToOperation(
  item: DrawingItem,
  sequence: number,
): Operation {
  if (item.tool === "rectangle") {
    return {
      id: item.id,
      sequence,
      type: "sketch_rectangle",
      parameters: {
        dimension: item.dimension,
        startPoint: item.points[0]!,
        endPoint: item.points[1]!,
        color: item.color,
      },
      dependencies: [],
      createdAt: new Date(parseInt(item.id)), // Assuming ID is timestamp
      updatedAt: new Date(parseInt(item.id)),
    };
  } else if (item.tool === "pencil") {
    return {
      id: item.id,
      sequence,
      type: "sketch_line",
      parameters: {
        dimension: item.dimension,
        points: item.points,
        color: item.color,
        closed: false,
      },
      dependencies: [],
      createdAt: new Date(parseInt(item.id)),
      updatedAt: new Date(parseInt(item.id)),
    };
  }

  throw new Error(`Unsupported tool: ${item.tool}`);
}

/**
 * Convert ExtrudedShape to ExtrudeOperation
 */
export function extrudedShapeToOperation(
  shape: ExtrudedShape,
  sequence: number,
  sketchOperationId: string,
): Operation {
  return {
    id: shape.id,
    sequence,
    type: "extrude",
    parameters: {
      sketchOperationId,
      depth: shape.depth,
      direction: "positive",
      color: shape.color,
    },
    dependencies: [sketchOperationId],
    createdAt: new Date(parseInt(shape.id)),
    updatedAt: new Date(parseInt(shape.id)),
  };
}

/**
 * Migrate all localStorage data for a document to database operations
 */
export async function migrateDocumentToOperations(documentId: string) {
  // Read from localStorage
  const sketchesKey = `polygon:sketch:document-${documentId}`;
  const extrudesKey = `polygon:extrude:document-${documentId}`;

  const sketchesJson =
    localStorage.getItem(sketchesKey) ?? '{"x":[],"y":[],"z":[]}';
  const extrudesJson = localStorage.getItem(extrudesKey) ?? "[]";

  const sketches = JSON.parse(sketchesJson) as Record<Dimension, DrawingItem[]>;
  const extrudes = JSON.parse(extrudesJson) as ExtrudedShape[];

  // Convert to operations
  const operations: Operation[] = [];
  let sequence = 0;

  // Add sketch operations
  const sketchIdMap = new Map<string, string>(); // old ID -> operation ID

  for (const dimension of ["x", "y", "z"] as const) {
    for (const sketch of sketches[dimension]) {
      const operation = drawingItemToOperation(sketch, sequence++);
      operations.push(operation);
      sketchIdMap.set(sketch.id, operation.id);
    }
  }

  // Add extrude operations
  for (const extrude of extrudes) {
    const sketchOpId = sketchIdMap.get(extrude.sketchId);
    if (!sketchOpId) continue;

    const operation = extrudedShapeToOperation(extrude, sequence++, sketchOpId);
    operations.push(operation);
  }

  return operations;
}

/**
 * Check if localStorage has data for a document
 */
export function hasLocalStorageData(documentId: string): boolean {
  const sketchesKey = `polygon:sketch:document-${documentId}`;
  const extrudesKey = `polygon:extrude:document-${documentId}`;

  const hasSketchData = localStorage.getItem(sketchesKey) !== null;
  const hasExtrudeData = localStorage.getItem(extrudesKey) !== null;

  return hasSketchData || hasExtrudeData;
}

/**
 * Clear localStorage data for a document after successful migration
 */
export function clearLocalStorageData(documentId: string): void {
  localStorage.removeItem(`polygon:sketch:document-${documentId}`);
  localStorage.removeItem(`polygon:extrude:document-${documentId}`);
  localStorage.removeItem(`polygon:history:document-${documentId}`);
}
