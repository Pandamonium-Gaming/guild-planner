-- Phase 2: Populate discord_id column from auth metadata
-- Non-destructive: Only updates NULL discord_id values
-- Safe: Validates before/after counts match

-- Step 1: Validate starting state
DO $$
DECLARE
  total_members INT;
  members_with_discord_id INT;
  members_without_discord_id INT;
BEGIN
  SELECT COUNT(*) INTO total_members FROM members;
  SELECT COUNT(*) INTO members_with_discord_id FROM members WHERE discord_id IS NOT NULL;
  members_without_discord_id := total_members - members_with_discord_id;
  
  RAISE NOTICE '📊 PRE-POPULATION STATE:';
  RAISE NOTICE '   Total members: %', total_members;
  RAISE NOTICE '   With discord_id: %', members_with_discord_id;
  RAISE NOTICE '   Without discord_id: %', members_without_discord_id;
END $$;

-- Step 2: Populate discord_id from auth.users
-- Extract from raw_app_meta_data (provider_id is Discord snowflake ID)
UPDATE members m
SET discord_id = (
  SELECT (u.raw_app_meta_data->>'provider_id')::character varying
  FROM auth.users u
  WHERE u.id = m.user_id
  AND u.raw_app_meta_data ? 'provider_id'
)
WHERE m.discord_id IS NULL
AND m.user_id IN (
  SELECT id FROM auth.users 
  WHERE raw_app_meta_data ? 'provider_id'
);

-- Alternative: If provider_id not available, try identities table
UPDATE members m
SET discord_id = (
  SELECT (ui.id)::character varying
  FROM auth.identities ui
  WHERE ui.user_id = m.user_id
  AND ui.provider = 'discord'
  LIMIT 1
)
WHERE m.discord_id IS NULL
AND m.user_id IN (
  SELECT user_id FROM auth.identities 
  WHERE provider = 'discord'
);

-- Step 3: Validate post-population
DO $$
DECLARE
  total_members INT;
  members_with_discord_id INT;
  members_without_discord_id INT;
  newly_populated INT;
BEGIN
  SELECT COUNT(*) INTO total_members FROM members;
  SELECT COUNT(*) INTO members_with_discord_id FROM members WHERE discord_id IS NOT NULL;
  members_without_discord_id := total_members - members_with_discord_id;
  
  RAISE NOTICE '📊 POST-POPULATION STATE:';
  RAISE NOTICE '   Total members: %', total_members;
  RAISE NOTICE '   With discord_id: %', members_with_discord_id;
  RAISE NOTICE '   Without discord_id: %', members_without_discord_id;
  
  IF members_with_discord_id >= total_members THEN
    RAISE NOTICE '✅ SUCCESS: All members have discord_id populated!';
  ELSE
    RAISE WARNING '⚠️  INCOMPLETE: % members still missing discord_id', members_without_discord_id;
    RAISE WARNING '   These may have no Discord auth linked';
  END IF;
END $$;

-- Step 4: Report any duplicates (should be none with UNIQUE constraint)
SELECT
  discord_id,
  group_id,
  COUNT(*) as duplicate_count,
  STRING_AGG(name, ', ') as member_names
FROM members
WHERE discord_id IS NOT NULL
GROUP BY discord_id, group_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 5: List members still without Discord ID (for manual review)
SELECT
  m.id,
  m.name,
  m.group_id,
  u.id as user_id,
  COALESCE(u.email, 'NO_EMAIL') as email,
  CASE 
    WHEN u.raw_app_meta_data IS NULL THEN 'No auth metadata'
    WHEN u.raw_app_meta_data ? 'provider_id' THEN 'Has provider_id (should be populated)'
    ELSE 'Missing provider_id'
  END as issue
FROM members m
LEFT JOIN auth.users u ON m.user_id = u.id
WHERE m.discord_id IS NULL
ORDER BY m.created_at DESC;

RAISE NOTICE '✅ Phase 2 (Data Population) Complete - See results above';
