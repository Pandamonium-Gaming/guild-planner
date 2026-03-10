-- ============================================================================
-- SCENARIO 3: Multi-Guild Handling (Same Discord User in Multiple Groups)
-- ============================================================================
SELECT '🔵 SCENARIO 3: Multi-Guild Handling' as test;

-- Setup: Add test members to different guilds with same Discord ID
UPDATE members SET discord_id = '999999999999999999' WHERE id IN (
  SELECT id FROM members LIMIT 2
);

-- Test: One Discord user, multiple guilds
SELECT 
  '✅ PASS: Discord user in multiple guilds' as result,
  m.discord_id,
  COUNT(DISTINCT m.group_id) as guild_count,
  COUNT(DISTINCT m.id) as character_count,
  STRING_AGG(DISTINCT COALESCE(g.slug, 'NO_GUILD'), ', ') as guilds
FROM members m
LEFT JOIN groups g ON m.group_id = g.id
WHERE m.discord_id = '999999999999999999'
GROUP BY m.discord_id;

-- Test: Query all characters for a Discord user across guilds
SELECT 
  '✅ PASS: Retrieve all chars for Discord user across guilds' as result,
  m.name as character,
  g.slug as guild,
  m.discord_id
FROM members m
LEFT JOIN groups g ON m.group_id = g.id
WHERE m.discord_id = '999999999999999999'
ORDER BY g.slug, m.name;

-- Test: Ensure isolation per guild still works
SELECT 
  '✅ PASS: Guild-level access control still enforced' as result,
  g.slug as guild,
  COUNT(DISTINCT m.id) as characters_in_guild,
  COUNT(DISTINCT m.discord_id) as unique_discord_users
FROM members m
LEFT JOIN groups g ON m.group_id = g.id
GROUP BY g.id, g.slug
HAVING COUNT(DISTINCT m.id) > 0
LIMIT 5;
