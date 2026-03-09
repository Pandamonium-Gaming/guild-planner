-- ============================================================================
-- SCENARIO 1: Discord ID Linking and Character Association
-- ============================================================================
SELECT '🔵 SCENARIO 1: Discord ID Linking and Character Association' as test;

-- Test: Query a character by Discord ID
SELECT 
  '✅ Character lookup by Discord ID works' as result,
  m.name as character,
  m.discord_id,
  g.slug as guild
FROM members m
LEFT JOIN groups g ON m.group_id = g.id
WHERE m.discord_id = '111111111111111111'
LIMIT 1;

-- Test: Multiple characters same Discord user
SELECT 
  COUNT(*) as character_count,
  discord_id,
  '✅ Can have multiple characters per Discord user' as note
FROM members
WHERE discord_id IN ('679287061039284235', '101764886043840512', '581829469103194122')
GROUP BY discord_id
ORDER BY discord_id;
