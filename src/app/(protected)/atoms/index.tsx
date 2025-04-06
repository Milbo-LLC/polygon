import { atomWithStorage } from "jotai/utils";

export const sidebarCollapsedAtom = atomWithStorage<boolean>("polygon:sidebar:collapsed", false);

export const activeOrganizationIdAtom = atomWithStorage<string | null>("polygon:activeOrganizationId", null);

// Theme options: 'light', 'dark', or 'system'
export type ThemeMode = 'light' | 'dark' | 'system';

// Create atom that persists in localStorage with key 'theme'
export const themeAtom = atomWithStorage<ThemeMode>('theme', 'system');

export const pendingInvitationCodeAtom = atomWithStorage<string | null>(
  'pendingInvitationCode',
  null
);