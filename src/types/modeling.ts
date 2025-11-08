import { z } from "zod";

export const dimensionSchema = z.enum(["x", "y", "z"]);
export type Dimension = z.infer<typeof dimensionSchema>;

export const toolSchema = z.enum(["pencil", "rectangle", "eraser", "select"]);
export type Tool = z.infer<typeof toolSchema>;

export const point3DSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});
export type Point3D = z.infer<typeof point3DSchema>;

export const drawingItemSchema = z.object({
  id: z.string(),
  tool: toolSchema,
  color: z.string(),
  points: z.array(point3DSchema),
  dimension: dimensionSchema,
});
export type DrawingItem = z.infer<typeof drawingItemSchema>;

export const extrudedShapeSchema = z.object({
  id: z.string(),
  sketchId: z.string(),
  dimension: dimensionSchema,
  depth: z.number(),
  color: z.string(),
});
export type ExtrudedShape = z.infer<typeof extrudedShapeSchema>;

export const historyActionTypeSchema = z.enum([
  "create_sketch",
  "delete_sketch",
  "clear_sketches",
  "extrude",
  "undo_sketch",
]);
export type HistoryActionType = z.infer<typeof historyActionTypeSchema>;

export const historyActionSchema = z.object({
  type: historyActionTypeSchema,
  description: z.string(),
  metadata: z.object({
    sketchId: z.string().optional(),
    dimension: dimensionSchema.optional(),
    depth: z.number().optional(),
    tool: toolSchema.optional(),
    count: z.number().optional(),
  }),
});
export type HistoryAction = z.infer<typeof historyActionSchema>;

export const documentHistoryStepSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  action: historyActionSchema,
  state: z.object({
    sketches: z.object({
      x: z.array(drawingItemSchema),
      y: z.array(drawingItemSchema),
      z: z.array(drawingItemSchema),
    }),
    extrudedShapes: z.array(extrudedShapeSchema),
  }),
});
export type HistoryStep = z.infer<typeof documentHistoryStepSchema>;

export const documentHistorySchema = z.object({
  steps: z.array(documentHistoryStepSchema),
  currentStepIndex: z.number(),
});
export type DocumentHistory = z.infer<typeof documentHistorySchema>;

export const documentStateSchema = z.object({
  sketches: z.object({
    x: z.array(drawingItemSchema),
    y: z.array(drawingItemSchema),
    z: z.array(drawingItemSchema),
  }),
  extrudedShapes: z.array(extrudedShapeSchema),
  history: documentHistorySchema.optional(),
});
export type DocumentState = z.infer<typeof documentStateSchema>;

export const createEmptySketchRecord = (): Record<Dimension, DrawingItem[]> => ({
  x: [],
  y: [],
  z: [],
});

export const createEmptyDocumentState = (): DocumentState => ({
  sketches: createEmptySketchRecord(),
  extrudedShapes: [],
  history: undefined,
});
