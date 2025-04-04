import { atomWithStorage } from "jotai/utils";

export const sidebarCollapsedAtom = atomWithStorage<boolean>("polygon:sidebar:collapsed", false);

export const activeOrganizationIdAtom = atomWithStorage<string | null>("polygon:activeOrganizationId", null);