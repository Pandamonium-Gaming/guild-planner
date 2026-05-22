export type GroupRole = 'admin' | 'officer' | 'member' | 'trial' | 'pending' | null;

export interface GroupPermissionsSnapshot {
  groupId: string;
  userId: string;
  role: GroupRole;
  permissions: string[];
}

/**
 * PR-01 scaffold: permission seam.
 * Phase 1 PR-04 will implement authoritative DB role resolution and permission mapping.
 */
export async function getGroupPermissionsSnapshot(
  _groupId: string,
  _userId: string
): Promise<GroupPermissionsSnapshot | null> {
  return null;
}
