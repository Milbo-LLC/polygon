# Polygon: Operation-Based Parametric CAD System - Implementation Plan

## Executive Summary

Transform Polygon from a state-based localStorage system to a professional operation-based parametric CAD system with database persistence, proper history management, and export capabilities (STL, STEP, native JSON).

**Approach:** Phased implementation starting with database persistence and basic operation model, establishing foundation for future parametric features (constraints, patterns, advanced operations).

---

## Phase 1: Database Persistence + Operation Model Foundation

### Goals
- Move CAD data from localStorage to PostgreSQL database
- Establish operation-based architecture (vs current state snapshots)
- Maintain backward compatibility during transition
- Enable auto-save and cross-device access

---

## 1. Database Schema Design

### New Prisma Models

**File:** `prisma/schema.prisma`

```prisma
// Operation types: sketch_line, sketch_rectangle, sketch_circle, extrude, etc.
model DocumentOperation {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  // Operation metadata
  sequence    Int      // Order in timeline (0, 1, 2, ...)
  type        String   // Operation type discriminator
  parameters  Json     // Type-specific parameters

  // Dependency tracking (for future parametric features)
  dependencies String[] // IDs of operations this depends on

  // Audit trail
  createdBy   String?  // User who created this operation
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Soft delete (preserve history)
  deletedAt   DateTime?

  @@unique([documentId, sequence])
  @@index([documentId, sequence])
  @@index([documentId, deletedAt]) // For active operations query
}

// Computed geometry cache (performance optimization)
model ComputedGeometry {
  id            String   @id @default(cuid())
  documentId    String
  document      Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  operationId   String   @unique

  // Cached Three.js geometry data
  vertices      Json     // Float32Array serialized
  indices       Json     // Uint16Array serialized
  normals       Json     // Float32Array serialized

  // Cache metadata
  computedAt    DateTime @default(now())
  isValid       Boolean  @default(true)

  @@index([documentId])
}

// Update existing Document model
model Document {
  // ... existing fields ...

  // Remove generic 'state' field, add specific relations
  operations        DocumentOperation[]
  computedGeometry  ComputedGeometry[]

  // Document-level settings
  unit              String   @default("millimeter") // For export
  gridSize          Float    @default(100)
  gridDivisions     Int      @default(100)
}
```

**Migration Strategy:**
1. Add new models alongside existing `Document.state` field
2. Create migration: `prisma migrate dev --name add_operations_model`
3. Keep `state` field temporarily for rollback safety
4. After validation, deprecate `state` field in future migration

---

## 2. Operation Type System

### Core Type Definitions

**New File:** `src/types/operations.ts`

```typescript
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
```

### Validator Schemas

**New File:** `src/validators/operations.ts`

```typescript
import { z } from 'zod'
import {
  SketchLineParametersSchema,
  SketchRectangleParametersSchema,
  ExtrudeParametersSchema,
} from '@/types/operations'

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
```

---

## 3. tRPC API Design

See full implementation in the complete plan file.

---

## 4. Migration Strategy

See full migration details in the complete plan file.

---

## 5-11. Additional Sections

For complete implementation details including:
- Client-Side Architecture Updates
- Export System Implementation
- Implementation Phases
- Critical Files Summary
- Testing Strategy
- Performance Considerations
- Future Extensibility

Please refer to the full plan file at `/Users/noahmilberger/.claude/plans/abundant-zooming-panda.md`

---

## Quick Reference

### Phase 1 Tasks (Weeks 1-3)
1. Database schema design & Prisma migration
2. Operation type system & validators
3. tRPC API implementation
4. localStorage migration utilities
5. Client-side integration

### Phase 2 Tasks (Weeks 4-6)
1. STL export functionality
2. Native JSON export/import
3. STEP export research

### Phase 3 Tasks (Weeks 7-10)
1. Circle sketch tool
2. Dependency graph system
3. Basic constraints implementation

### Success Criteria
- ✅ All CAD data in PostgreSQL
- ✅ Auto-save working (5-second debounce)
- ✅ Export to STL, STEP, JSON
- ✅ Operation-based timeline
- ✅ Parametric editing capability

---

*Last Updated: 2025-12-13*
