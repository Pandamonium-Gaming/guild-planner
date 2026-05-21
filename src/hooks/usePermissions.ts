'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useGroupMembership } from './useGroupMembership';
import { supabase } from '@/lib/supabase';
import { GroupRole, roleHasPermission, canManageRole, DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions';

export interface RolePermissions {
  role: GroupRole;
  permissions: Set<string>;
}

export function usePermissions(groupId ?: string) {
  const { user } = useAuth();
  const { membership } = useGroupMembership(groupId || null, user?.id || null);
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean> | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Fetch custom permission overrides from the server
  useEffect(() => {
    if (!groupId || !user || !membership?.role) return;

    let isCancelled = false;

    const fetchPermissions = async () => {
      try {
        const sessionResponse = await supabase.auth.getSession();
        const session = sessionResponse?.data?.session ?? null;
        if (!session) return;

        if (!isCancelled) {
          setLoading(true);
        }

        // Include group_id as a query parameter
        const response = await fetch(`/api/group/permissions?group_id=${encodeURIComponent(groupId!)}` , {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const { permissions } = await response.json();
          const overrides = permissions?.find((o: any) => o.role === membership?.role);
          if (overrides) {
            // Extract just the permission columns (all the boolean fields)
            const perms: Record<string, boolean> = {};
            Object.keys(overrides).forEach(key => {
              if (key !== 'id' && key !== 'clan_id' && key !== 'role' && key !== 'created_at' && key !== 'updated_at') {
                perms[key] = overrides[key];
              }
            });
            if (!isCancelled) {
              setCustomPermissions(perms);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching permissions:', err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void fetchPermissions();

    return () => {
      isCancelled = true;
    };
  }, [groupId, user, membership?.role]);
  
  // Check if current user has a specific permission
  // First checks custom overrides, then falls back to default role permissions
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user || !membership) return false;

    // If we have custom permissions loaded, check those first
    if (customPermissions !== null) {
      // Convert permission ID to database column name (convert underscores to match DB format)
      const dbColumnName = permission; // Already in correct format from PERMISSIONS object
      if (dbColumnName in customPermissions) {
        return customPermissions[dbColumnName];
      }
    }

    // Fall back to default role permissions
    const userRole = membership.role as GroupRole;
    return roleHasPermission(userRole, permission);
  }, [user, membership, customPermissions]);

  // Get current user's role
  const getUserRole = useCallback((): GroupRole => {
    return (membership?.role as GroupRole) ?? 'pending';
  }, [membership]);

  // Check if user can manage another role
  const canManage = useCallback((targetRole: GroupRole): boolean => {
    const userRole = getUserRole();
    return canManageRole(userRole, targetRole);
  }, [getUserRole]);

  // Check multiple permissions (all must be true)
  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    return permissions.every(perm => hasPermission(perm));
  }, [hasPermission]);

  // Check multiple permissions (any must be true)
  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    return permissions.some(perm => hasPermission(perm));
  }, [hasPermission]);

  // Check if user is admin
  const isAdmin = useCallback((): boolean => {
    return getUserRole() === 'admin';
  }, [getUserRole]);

  // Check if user is admin or officer
  const isLeadership = useCallback((): boolean => {
    const role = getUserRole();
    return role === 'admin' || role === 'officer';
  }, [getUserRole]);

  return {
    userRole: getUserRole(),
    hasPermission,
    canManage,
    hasAllPermissions,
    hasAnyPermission,
    isAdmin,
    isLeadership,
    rolePermissions: customPermissions,
    loading,
  };
}

