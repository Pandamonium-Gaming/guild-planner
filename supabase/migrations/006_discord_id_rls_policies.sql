-- Migration: 006_discord_id_rls_policies
-- Purpose: Add Discord ID-based RLS policies for resilience to auth UUID changes
-- Date: 2026-03-09
-- Phase: 5 (RLS Policy Updates)
-- Description:
--   Adds new helper functions and RLS policies that accept Discord ID as a fallback
--   authenticator. This ensures users can access characters even if auth UUID changes
--   during database restore/migration scenarios.
--
-- Design Philosophy:
--   - PRIMARY: Keep existing auth UUID-based policies (backwards compatible)
--   - FALLBACK: Add Discord ID-based access paths
--   - PATTERN: user_has_clan_role() OR user_has_clan_role_by_discord()

-- =====================================================
-- PART 1: HELPER FUNCTIONS
-- =====================================================

-- Function to check if a Discord user has a role in a group via Discord ID
-- Returns: BOOLEAN (true if user has role, false otherwise)
CREATE OR REPLACE FUNCTION user_has_clan_role_by_discord(
  check_group_id UUID,
  check_discord_id TEXT,
  allowed_roles TEXT[]
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Look up member by Discord ID, then check if their user has the role
  RETURN EXISTS (
    SELECT 1 FROM members m
    INNER JOIN group_members gm ON m.user_id = gm.user_id
    WHERE m.group_id = check_group_id
    AND m.discord_id = check_discord_id
    AND gm.group_id = check_group_id
    AND gm.role = ANY(allowed_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION user_has_clan_role_by_discord(UUID, TEXT, TEXT[]) IS 
  'Checks if a Discord user (via discord_id) has an approved role in a group. Used as fallback when auth UUID is unavailable or changed.';

-- Function to get current user's Discord ID from auth metadata
-- Returns: TEXT (Discord ID as string) or NULL if not found
CREATE OR REPLACE FUNCTION current_user_discord_id()
RETURNS TEXT AS $$
BEGIN
  -- Try to extract Discord ID from auth.users.raw_app_meta_data
  RETURN (auth.jwt() -> 'user_metadata' ->> 'discord_id');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION current_user_discord_id() IS 
  'Retrieves current authenticated user''s Discord ID from JWT metadata. Returns NULL if not available.';

-- =====================================================
-- PART 2: UPDATE MEMBERS TABLE POLICIES
-- =====================================================

-- Add Discord ID-based fallback to members SELECT policy
DROP POLICY IF EXISTS "Approved members can view members" ON members;

CREATE POLICY "Approved members can view members" ON members
  FOR SELECT USING (
    -- Primary: User ID match (original auth UUID path)
    user_has_clan_role(group_id, auth.uid(), ARRAY['admin', 'officer', 'member'])
    OR
    -- Fallback: Discord ID match (resilient to auth UUID changes)
    (
      NULLIF(current_user_discord_id(), '') IS NOT NULL
      AND user_has_clan_role_by_discord(
        group_id, 
        current_user_discord_id(), 
        ARRAY['admin', 'officer', 'member']
      )
    )
  );

COMMENT ON POLICY "Approved members can view members" ON members IS 
  'Members can view other members in their group via auth UUID (primary) or Discord ID (fallback for restored auth).';

-- =====================================================
-- PART 3: UPDATE CHARACTER-RELATED POLICIES
-- =====================================================

-- member_professions: Add Discord ID fallback
DROP POLICY IF EXISTS "Members can modify own character professions" ON member_professions;

CREATE POLICY "Members can modify own character professions" ON member_professions
  FOR ALL USING (
    -- Primary: Own character via user_id
    member_id IN (
      SELECT m.id FROM members m
      WHERE m.user_id = auth.uid()
    )
    OR
    -- Fallback: Own character via Discord ID
    (
      NULLIF(current_user_discord_id(), '') IS NOT NULL
      AND member_id IN (
        SELECT m.id FROM members m
        WHERE m.discord_id = current_user_discord_id()
      )
    )
    OR
    -- Officers/Admin can modify any character in their group
    member_id IN (
      SELECT m.id FROM members m
      WHERE user_has_clan_role(m.group_id, auth.uid(), ARRAY['admin', 'officer'])
    )
  );

COMMENT ON POLICY "Members can modify own character professions" ON member_professions IS 
  'Members can manage professions for their own characters (via user_id or Discord ID) or admins can manage all.';

-- =====================================================
-- PART 4: VALIDATION & TESTING
-- =====================================================

-- Verify functions exist and are callable
DO $$ 
BEGIN
  PERFORM user_has_clan_role_by_discord(
    '00000000-0000-0000-0000-000000000000'::UUID,
    '000000000000000000',
    ARRAY['admin']
  );
  RAISE NOTICE '✓ user_has_clan_role_by_discord() callable';
  
  PERFORM current_user_discord_id();
  RAISE NOTICE '✓ current_user_discord_id() callable';
  
  RAISE NOTICE '✓ Phase 5 (RLS Policies) Complete - Discord ID fallback paths added';
END $$;

-- =====================================================
-- PART 5: MIGRATION TRACKING
-- =====================================================

INSERT INTO migration_history (filename) VALUES ('006_discord_id_rls_policies.sql') ON CONFLICT DO NOTHING;
