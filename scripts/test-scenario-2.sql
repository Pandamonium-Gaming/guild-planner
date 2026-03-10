-- ============================================================================
-- SCENARIO 2: Character Ownership Survives Database Restore (DR Scenario)
-- ============================================================================
SELECT '🔵 SCENARIO 2: Character Ownership Survives Database Restore' as test;

-- Scenario: Auth UUID changes during restore, but Discord ID stays the same
-- Test: Characters accessible via Discord ID even if user_id changes

SELECT 
  '✅ PASS: Discord ID lookup finds character with old auth UUID' as result,
  m.name as character,
  m.discord_id as immutable_discord_id,
  m.user_id::text as old_prod_uuid,
  g.slug as guild
FROM members m
LEFT JOIN groups g ON m.group_id = g.id
WHERE m.discord_id = '679287061039284235';

-- Test: Join via Discord ID (what new-auth path would do)
SELECT 
  '✅ PASS: New auth UUID can find character via Discord ID' as result,
  COUNT(DISTINCT m.id) as characters_found,
  m.discord_id
FROM members m
WHERE EXISTS (
  SELECT 1 FROM users u 
  WHERE u.discord_id::text = m.discord_id::text
  AND m.discord_id IS NOT NULL
)
AND m.discord_id IN ('679287061039284235', '101764886043840512')
GROUP BY m.discord_id;
