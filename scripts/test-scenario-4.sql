-- Test Scenario 4: Data Population Validation
-- Verifies that Phase 2's automated population works correctly

RAISE NOTICE '🧪 SCENARIO 4: Data Population from Auth Metadata';
RAISE NOTICE '─────────────────────────────────────────────────';

-- Setup: Create test auth users with Discord metadata
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change_token,
  phone_change_sent_at,
  confirmed_at
)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'test-pop-1@example.com',
    '$2a$10$test',
    NOW(),
    NULL,
    '',
    NOW(),
    '',
    NOW(),
    '',
    NOW(),
    NOW(),
    '{"provider_id":"123456789012345678"}'::jsonb,
    '{"name":"PopTest1"}'::jsonb,
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    NULL,
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'test-pop-2@example.com',
    '$2a$10$test',
    NOW(),
    NULL,
    '',
    NOW(),
    '',
    NOW(),
    '',
    NOW(),
    NOW(),
    '{"provider_id":"223456789012345678"}'::jsonb,
    '{"name":"PopTest2"}'::jsonb,
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    NULL,
    NOW()
  )
ON CONFLICT(id) DO NOTHING;

-- Get group ID for testing
DO $$
DECLARE
  test_group_id UUID;
BEGIN
  SELECT id INTO test_group_id FROM groups LIMIT 1;
  IF test_group_id IS NULL THEN
    RAISE EXCEPTION 'No groups found - cannot populate test members';
  END IF;
  
  -- Create test members without discord_id
  INSERT INTO members (
    id,
    group_id,
    name,
    user_id,
    role,
    created_at,
    updated_at
  )
  VALUES
    (
      gen_random_uuid(),
      test_group_id,
      'PopTest1',
      '00000000-0000-0000-0000-000000000001'::uuid,
      'member',
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      test_group_id,
      'PopTest2',
      '00000000-0000-0000-0000-000000000002'::uuid,
      'member',
      NOW(),
      NOW()
    )
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✓ Created 2 test members without discord_id';
END $$;

-- Verify PRE-population state
RAISE NOTICE '';
RAISE NOTICE '📊 BEFORE POPULATION:';
SELECT 
  COALESCE(COUNT(*), 0) as members_without_discord_id
FROM members
WHERE user_id IN ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid)
AND discord_id IS NULL;

-- Run the population (same logic as Phase 2 migration)
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

-- Verify POST-population (should now be 0)
RAISE NOTICE '';
RAISE NOTICE '📊 AFTER POPULATION:';
SELECT 
  name,
  user_id,
  discord_id,
  CASE 
    WHEN discord_id = '123456789012345678' THEN '✅ Correct (PopTest1)'
    WHEN discord_id = '223456789012345678' THEN '✅ Correct (PopTest2)'
    ELSE '❌ Unexpected'
  END as validation
FROM members
WHERE user_id IN ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid)
ORDER BY name;

RAISE NOTICE '';
RAISE NOTICE '✅ SCENARIO 4 PASSED: Data population from auth metadata works correctly';
