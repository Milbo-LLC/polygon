import { z } from "zod";

export const DocumentStateSchema = z.object({
  actions: z.array(z.string()).optional(),
});

export type DocumentState = z.infer<typeof DocumentStateSchema>;

export const DocumentSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  name: z.string(),
  projectId: z.string(),
  state: z.any(), // or more specific schema for your state
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