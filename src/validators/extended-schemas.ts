import { z } from "zod";
import { 
  OrganizationBaseSchema,
  OrganizationSchema 
} from "./organizations";
import { 
  UserOrganizationBaseSchema 
} from "./user-organizations";
import { 
  ProjectBaseSchema 
} from "./projects";
import { 
  DocumentSchema 
} from "./documents";
import { 
  UserSchema 
} from "./users";

// Extended Project schema with Documents
export const ProjectWithDocumentsSchema = ProjectBaseSchema.extend({
  documents: z.array(DocumentSchema).nullable(),
});

// Extended Organization schema with Projects
export const OrganizationWithProjectsSchema = OrganizationBaseSchema.extend({
  projects: z.array(ProjectWithDocumentsSchema).nullable(),
});

// Extended UserOrganization schema with Organization
export const UserOrganizationWithOrgSchema = UserOrganizationBaseSchema.extend({
  organization: OrganizationSchema,
  user: UserSchema
});

// Type exports
export type ProjectWithDocuments = z.infer<typeof ProjectWithDocumentsSchema>;
export type OrganizationWithProjects = z.infer<typeof OrganizationWithProjectsSchema>;
export type UserOrganizationWithOrg = z.infer<typeof UserOrganizationWithOrgSchema>; 