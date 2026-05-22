export interface UserProfileRecord {
  id: string;
  discordId: string | null;
  displayName: string | null;
  timezone: string;
}

/**
 * PR-01 scaffold: repository seam for profile reads.
 * Phase 1 PR-03 will provide implementation behind AUTH_STACK=v2.
 */
export async function findUserProfileById(_userId: string): Promise<UserProfileRecord | null> {
  return null;
}
