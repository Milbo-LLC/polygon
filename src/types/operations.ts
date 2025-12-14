import { z } from 'zod'

// ============================================================================
// BASE OPERATION TYPES
// ============================================================================

export const Point3DSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
})
export type Point3D = z.infer<typeof Point3DSchema>

export const DimensionSchema = z.enum(['x', 'y', 'z'])
export type Dimension = z.infer<typeof DimensionSchema>

// Base operation interface
export interface BaseOperation {
  id: string
  sequence: number
  type: OperationType
  parameters: Record<string, unknown>
  dependencies: string[]
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// SKETCH OPERATIONS
// ============================================================================

// Sketch Line (from pencil tool)
export const SketchLineParametersSchema = z.object({
  dimension: DimensionSchema,
  points: z.array(Point3DSchema).min(2), // Array of connected points
  color: z.string().default('#000000'),
  closed: z.boolean().default(false),
})
export type SketchLineParameters = z.infer<typeof SketchLineParametersSchema>

export interface SketchLineOperation extends BaseOperation {
  type: 'sketch_line'
  parameters: SketchLineParameters
}

// Sketch Rectangle
export const SketchRectangleParametersSchema = z.object({
  dimension: DimensionSchema,
  startPoint: Point3DSchema,
  endPoint: Point3DSchema,
  color: z.string().default('#000000'),
})
export type SketchRectangleParameters = z.infer<typeof SketchRectangleParametersSchema>

export interface SketchRectangleOperation extends BaseOperation {
  type: 'sketch_rectangle'
  parameters: SketchRectangleParameters
}

// Sketch Circle (future)
export const SketchCircleParametersSchema = z.object({
  dimension: DimensionSchema,
  center: Point3DSchema,
  radius: z.number().positive(),
  color: z.string().default('#000000'),
})
export type SketchCircleParameters = z.infer<typeof SketchCircleParametersSchema>

export interface SketchCircleOperation extends BaseOperation {
  type: 'sketch_circle'
  parameters: SketchCircleParameters
}

// ============================================================================
// 3D FEATURE OPERATIONS
// ============================================================================

// Extrude
export const ExtrudeParametersSchema = z.object({
  sketchOperationId: z.string(), // ID of sketch operation to extrude
  depth: z.number().positive(),
  direction: z.enum(['positive', 'negative', 'symmetric']).default('positive'),
  color: z.string().optional(), // Inherit from sketch if not specified
})
export type ExtrudeParameters = z.infer<typeof ExtrudeParametersSchema>

export interface ExtrudeOperation extends BaseOperation {
  type: 'extrude'
  parameters: ExtrudeParameters
  dependencies: [string] // Must reference sketch operation
}

// Revolve (future)
export const RevolveParametersSchema = z.object({
  sketchOperationId: z.string(),
  axis: z.enum(['x', 'y', 'z']),
  angle: z.number().min(0).max(360),
  color: z.string().optional(),
})
export type RevolveParameters = z.infer<typeof RevolveParametersSchema>

export interface RevolveOperation extends BaseOperation {
  type: 'revolve'
  parameters: RevolveParameters
  dependencies: [string]
}

// ============================================================================
// MODIFICATION OPERATIONS (Future)
// ============================================================================

// Fillet
export const FilletParametersSchema = z.object({
  targetOperationId: z.string(), // Operation to fillet
  edgeIndices: z.array(z.number()), // Which edges to fillet
  radius: z.number().positive(),
})
export type FilletParameters = z.infer<typeof FilletParametersSchema>

export interface FilletOperation extends BaseOperation {
  type: 'fillet'
  parameters: FilletParameters
  dependencies: [string]
}

// Pattern (Linear/Circular)
export const PatternParametersSchema = z.object({
  targetOperationId: z.string(),
  patternType: z.enum(['linear', 'circular']),
  count: z.number().int().min(2),
  spacing: z.number().optional(), // For linear
  angle: z.number().optional(), // For circular
  axis: DimensionSchema.optional(),
})
export type PatternParameters = z.infer<typeof PatternParametersSchema>

export interface PatternOperation extends BaseOperation {
  type: 'pattern'
  parameters: PatternParameters
  dependencies: [string]
}

// ============================================================================
// UNION TYPE
// ============================================================================

export type OperationType =
  | 'sketch_line'
  | 'sketch_rectangle'
  | 'sketch_circle'
  | 'extrude'
  | 'revolve'
  | 'fillet'
  | 'chamfer'
  | 'pattern'
  | 'shell'
  | 'constraint' // For future parametric constraints

export type Operation =
  | SketchLineOperation
  | SketchRectangleOperation
  | SketchCircleOperation
  | ExtrudeOperation
  | RevolveOperation
  | FilletOperation
  | PatternOperation

// Operation parameter union for validation
export const OperationParametersSchema = z.union([
  SketchLineParametersSchema,
  SketchRectangleParametersSchema,
  SketchCircleParametersSchema,
  ExtrudeParametersSchema,
  RevolveParametersSchema,
  FilletParametersSchema,
  PatternParametersSchema,
])
