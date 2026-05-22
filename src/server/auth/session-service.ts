import { getServerAuthStack } from '@/lib/authStack';

export interface SessionSnapshot {
  stack: 'v1' | 'v2';
  userId: string | null;
  discordId: string | null;
  displayName: string | null;
}

/**
 * PR-01 scaffold: server auth seam.
 *
 * This intentionally returns an empty snapshot while the app still runs on v1.
 * Phase 1 PR-02 will implement Auth.js-backed session resolution for v2.
 */
export async function getSessionSnapshot(): Promise<SessionSnapshot> {
  return {
    stack: getServerAuthStack(),
    userId: null,
    discordId: null,
    displayName: null,
  };
}
