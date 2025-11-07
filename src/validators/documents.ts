import { z } from "zod";

import {
  createEmptyDocumentState,
  documentStateSchema,
  type DocumentState,
} from "~/types/modeling";

export const DocumentStateSchema = documentStateSchema;

export const DocumentSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  name: z.string(),
  projectId: z.string(),
  state: DocumentStateSchema,
});

export type Document = z.infer<typeof DocumentSchema>;

export const CreateDocumentSchema = DocumentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  state: true,
});

export const UpdateDocumentSchema = DocumentSchema.omit({
  createdAt: true,
  updatedAt: true,
  projectId: true,
}).partial();

export const emptyDocumentState = createEmptyDocumentState;