-- Phase 1: Add Discord ID column to members table for resilient character ownership
-- Discord IDs are immutable across restores, unlike Supabase auth UUIDs

ALTER TABLE public.members ADD COLUMN discord_id TEXT;

-- Index for fast lookups when syncing characters via Discord ID
CREATE INDEX idx_members_discord_id ON public.members(discord_id);

-- Index for composite lookups: group + discord_id
CREATE INDEX idx_members_group_discord_id ON public.members(group_id, discord_id);

COMMENT ON COLUMN public.members.discord_id IS 'Discord user ID (snowflake) - immutable across database restores for DR resilience';
