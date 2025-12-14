import { z } from 'zod'
import {
  SketchLineParametersSchema,
  SketchRectangleParametersSchema,
  SketchCircleParametersSchema,
  ExtrudeParametersSchema,
  RevolveParametersSchema,
  FilletParametersSchema,
  PatternParametersSchema,
} from '@/types/operations'

// ============================================================================
// OPERATION CRUD SCHEMAS
// ============================================================================

// Create operation request
export const CreateOperationSchema = z.object({
  documentId: z.string(),
  type: z.string(),
  parameters: z.record(z.unknown()), // Validated by type-specific schema
  dependencies: z.array(z.string()).default([]),
})

// Update operation request
export const UpdateOperationSchema = z.object({
  operationId: z.string(),
  parameters: z.record(z.unknown()).partial(),
})

// Batch operations request
export const BatchOperationsSchema = z.object({
  documentId: z.string(),
  operations: z.array(CreateOperationSchema.omit({ documentId: true })),
})

// Get operations by document
export const GetOperationsByDocumentSchema = z.object({
  documentId: z.string(),
})

// Get single operation
export const GetOperationByIdSchema = z.object({
  operationId: z.string(),
})

// Delete operation
export const DeleteOperationSchema = z.object({
  operationId: z.string(),
})

// Reorder operations
export const ReorderOperationSchema = z.object({
  documentId: z.string(),
  operationId: z.string(),
  newSequence: z.number().int().min(0),
})

// ============================================================================
// EXPORT SCHEMAS
// ============================================================================

// Export request
export const ExportDocumentSchema = z.object({
  documentId: z.string(),
  format: z.enum(['stl', 'step', 'json', '3mf']),
  options: z.object({
    unit: z.enum(['millimeter', 'centimeter', 'meter', 'inch']).optional(),
    tessellationTolerance: z.number().positive().optional(),
    includeMetadata: z.boolean().default(true),
  }).optional(),
})

// ============================================================================
// TYPE-SPECIFIC PARAMETER VALIDATORS
// ============================================================================

export const validateOperationParameters = (type: string, parameters: unknown) => {
  switch (type) {
    case 'sketch_line':
      return SketchLineParametersSchema.parse(parameters)
    case 'sketch_rectangle':
      return SketchRectangleParametersSchema.parse(parameters)
    case 'sketch_circle':
      return SketchCircleParametersSchema.parse(parameters)
    case 'extrude':
      return ExtrudeParametersSchema.parse(parameters)
    case 'revolve':
      return RevolveParametersSchema.parse(parameters)
    case 'fillet':
      return FilletParametersSchema.parse(parameters)
    case 'pattern':
      return PatternParametersSchema.parse(parameters)
    default:
      throw new Error(`Unknown operation type: ${type}`)
  }
}
