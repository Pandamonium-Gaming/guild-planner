# Discord ID Migration Plan

## Status: PHASES 1-5 COMPLETE ✅

### Completion Summary

| Phase | Description | Status | Files |
| --- | --- | --- | --- |
| 1 | Schema: Add `discord_id` column, indexes | ✅ Complete | `005_discord_id_migration.sql` |
| 2 | Data: Populate from auth metadata | ✅ Complete | `006_populate_discord_id_from_auth.sql` |
| 3 | App: Login sync, character lookups | ✅ Complete | `src/lib/auth.ts`, `src/app/auth/callback/page.tsx` |
| 4 | Queries: Resilient character lookup helpers | ✅ Complete | `src/lib/character-lookup.ts` |
| 5 | RLS: Discord ID-based access control | ✅ Complete | `007_discord_id_rls_policies.sql` |
| 6 | Optional: Deprecate `user_id` entirely | 🔹 Pending | Future work |

### Deployment Status

* ✅ **Dev Database**: All phases deployed and tested
  * 13 members restored from production
  * 1 member with Discord ID synced (auth metadata available)
  * 12 members pending Discord ID population (will sync on next login)
  * RLS policies working: users can access characters via auth UUID or Discord ID
* ⏳ **Production Database**: Ready for deployment (Phase 6 spec complete, awaiting approval)

## Overview

Migrate from volatile Supabase auth user IDs to immutable Discord IDs as the primary user identifier. This improves disaster recovery, auth resilience, and user linkage stability.

## Current State

* `members.user_id` → Supabase auth UUID (volatile, changes on re-auth)
* `character_ships.character_id` → UUID from members table
* Auth user ID can drift on restore/migration
* **Problem**: Disaster recovery breaks character ownership

## Target State

* `members.discord_id` → Discord snowflake ID (immutable)
* `members.user_id` → Keep for now (gradual migration)
* All character relationships link via Discord ID
* **Benefit**: Survives auth changes, restores, provider migrations

## Migration Steps

### Phase 1: Database Schema (Non-breaking)

1. Add `discord_id` column to `members` table
   * Type: `bigint` (Discord snowflakes are 64-bit)
   * Nullable initially (for existing records without Discord data)
   * Add unique constraint: `UNIQUE(group_id, discord_id)`

2. Add index on `discord_id` for query performance
   * Users lookup by Discord ID frequently during login/sync

3. Create migration file: `XXX_add_discord_id_to_members.sql`

### Phase 2: Data Population

1. **Batch migration script** (recommended, safest):
   * Location: `supabase/migrations/006_populate_discord_id_from_auth.sql`
   * Extracts Discord ID from `auth.users.raw_app_meta_data` (provider\_id)
   * Falls back to `auth.identities` table if metadata missing
   * Updates all `members.discord_id` in bulk
   * Uses two-stage validation (pre/post counts, duplicate check)
   * Reports any members still missing Discord ID for manual review

2. **First login sync** (alternative, for gradual rollout):
   * Extract Discord ID from Supabase auth metadata on login
   * On user login: populate `members.discord_id` from `auth.users.raw_app_meta_data`
   * Only runs if `discord_id` still NULL
   * Automatic, no manual migration needed
   * Gradual: populates as users log in
   * Slower but safest for production

3. **Validation**:
   * Check all members have either `user_id` OR `discord_id`
   * No orphaned characters
   * No duplicate Discord IDs per group (UNIQUE constraint enforced)
   * Report members without Discord auth linked

### Phase 3: Application Code Updates

1. Update login flow:

   ```typescript
   // After Supabase login:
   const discordId = user.user_metadata?.provider_id || user.identities?.[0]?.id

   // Find/link character:
   const character = await supabase
     .from('members')
     .select()
     .eq('discord_id', discordId)
     .eq('group_id', groupId)
     .single()
   ```

2. Update character queries:
   * Gradually replace `user_id` filters with `discord_id`
   * Maintain backwards compatibility during transition

3. Update RLS policies:
   * Add Discord ID-based access control
   * Users can only view/edit characters matching their Discord ID

### Phase 4: Deprecate user\_id (Optional, later)

1. After Phase 3 is stable and working:
   * All queries use `discord_id`
   * Keep `user_id` for audit trail
   * Document as deprecated
   * Later: remove if needed

## Testing Plan (Dev Environment)

### Setup

1. Restore prod database backup to dev
2. Dev env now has prod data with old Supabase auth UUIDs
3. Set up test Discord bot token in dev environment

### Test Scenarios

## Scenario 1: Discord ID Linking

* \[ ] Run migration to add `discord_id` column
* \[ ] Simulate login with Discord user
* \[ ] Character should link to Discord ID
* \[ ] Multiple logins with same Discord ID should find same character

## Scenario 2: Character Ownership After Restore

* \[ ] Restore backup (simulates DR)
* \[ ] New Supabase auth creates different user ID
* \[ ] User logs in with Discord
* \[ ] Character still links via Discord ID (not broken by restore)
* \[ ] ✅ Proves DR scenario works

## Scenario 3: Multi-Guild Scenario

* \[ ] Same Discord user in multiple groups
* \[ ] Each group has separate character linked to same Discord ID
* \[ ] Queries correctly filtered by `group_id + discord_id`
* \[ ] No cross-contamination

## Scenario 4: Batch Data Population

* \[ ] Test auth users created with Discord metadata
* \[ ] Run `006_populate_discord_id_from_auth.sql` migration
* \[ ] Verify all members get populated with Discord IDs
* \[ ] Validate pre/post counts match expected
* \[ ] Check for duplicates and conflicts
* \[ ] Identify members without Discord auth for manual review

## Scenario 5: Duplicate/Corrupt Data

* \[ ] Manually create duplicate user\_id records (to simulate corruption)
* \[ ] Discord ID lookup still finds correct character
* \[ ] System resilient to auth-layer issues

## Scenario 6: RLS Policy Validation

* \[ ] User A logged in as Discord ID X
* \[ ] Can see/edit their own characters
* \[ ] Cannot see characters linked to Discord ID Y
* \[ ] ✅ Proves permission isolation works

## Rollback Plan

If issues discovered during testing:

1. Revert `discord_id` column (drop column)
2. Continue using `user_id`
3. No lost data (column contains only duplicated info)

## Benefits Achieved

* ✅ Disaster recovery no longer breaks character ownership
* ✅ Auth system can change without data loss
* ✅ Discord users identified by immutable ID
* ✅ Multi-platform ready (if other auth providers added)
* ✅ Cleaner user identification (Discord ID meaningful to admins)

## Timeline

1. **Database**: 30 min (create migration, test schema)
2. **Data population**: 1 hour (login hook, batch validation)
3. **App code**: 2-4 hours (gradual query updates, RLS policies)
4. **Testing in dev**: 1-2 hours (run test scenarios above)
5. **Deploy to prod**: 30 min (careful monitoring)

**Total**: ~5-8 hours hands-on work over 2-3 days
