import type { Organization } from "@prisma/client";

// Base session user with essential properties returned from Better Auth
export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  activeOrganizationId?: string | null;
  organizations?: Organization[];
  [key: string]: unknown;
}

// UI-specific user type that includes all properties needed in components
// This avoids type incompatibilities by not extending SessionUser
export interface ExtendedSessionUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  activeOrganizationId: string | null;
  organizations?: Organization[];
  [key: string]: unknown;
}

// Session data structure
export interface Session {
  user?: SessionUser;
  [key: string]: unknown;
}

// Event handler types for better-auth
export interface SessionEventProps {
  session: Session;
  user: {
    id: string;
    name?: string;
    email?: string;
    [key: string]: unknown;
  };
}

export interface SignInEventProps {
  user: {
    id: string;
    name?: string;
    email?: string;
    [key: string]: unknown;
  };
} 