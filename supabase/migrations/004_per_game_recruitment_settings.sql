-- Migration: Add per-game recruitment settings
-- This allows each game to have its own recruitment status and messaging

-- Add game-specific recruitment columns
ALTER TABLE groups ADD COLUMN IF NOT EXISTS aoc_recruitment_open BOOLEAN DEFAULT FALSE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS sc_recruitment_open BOOLEAN DEFAULT FALSE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS ror_recruitment_open BOOLEAN DEFAULT FALSE;

ALTER TABLE groups ADD COLUMN IF NOT EXISTS aoc_recruitment_message TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS sc_recruitment_message TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS ror_recruitment_message TEXT;

ALTER TABLE groups ADD COLUMN IF NOT EXISTS aoc_public_description TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS sc_public_description TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS ror_public_description TEXT;

-- Add comments for clarity
COMMENT ON COLUMN groups.aoc_recruitment_open IS 'Whether Ashes of Creation recruitment is open for this guild';
COMMENT ON COLUMN groups.sc_recruitment_open IS 'Whether Star Citizen recruitment is open for this guild';
COMMENT ON COLUMN groups.ror_recruitment_open IS 'Whether Return of Reckoning recruitment is open for this guild';

COMMENT ON COLUMN groups.aoc_recruitment_message IS 'Recruitment message specific to Ashes of Creation';
COMMENT ON COLUMN groups.sc_recruitment_message IS 'Recruitment message specific to Star Citizen';
COMMENT ON COLUMN groups.ror_recruitment_message IS 'Recruitment message specific to Return of Reckoning';

COMMENT ON COLUMN groups.aoc_public_description IS 'Public description for Ashes of Creation guild page';
COMMENT ON COLUMN groups.sc_public_description IS 'Public description for Star Citizen organization page';
COMMENT ON COLUMN groups.ror_public_description IS 'Public description for Return of Reckoning warband page';

-- Add game_slug to recruitment_applications so applications are tied to specific games
ALTER TABLE recruitment_applications ADD COLUMN IF NOT EXISTS game_slug TEXT;

COMMENT ON COLUMN recruitment_applications.game_slug IS 'Which game this application is for (aoc, sc, ror, etc.)';

-- Add index for filtering applications by game
CREATE INDEX IF NOT EXISTS idx_applications_game_slug ON recruitment_applications(game_slug);

-- Add indexes for filtering groups by recruitment status per game (optional but useful for discovery)
CREATE INDEX IF NOT EXISTS idx_groups_aoc_recruitment ON groups(aoc_recruitment_open) WHERE aoc_recruitment_open = true;
CREATE INDEX IF NOT EXISTS idx_groups_sc_recruitment ON groups(sc_recruitment_open) WHERE sc_recruitment_open = true;
CREATE INDEX IF NOT EXISTS idx_groups_ror_recruitment ON groups(ror_recruitment_open) WHERE ror_recruitment_open = true;

-- Initialize game-specific recruitment settings from guild-wide settings for existing guilds
UPDATE groups
SET 
  aoc_recruitment_open = recruitment_open,
  sc_recruitment_open = recruitment_open,
  ror_recruitment_open = recruitment_open,
  aoc_recruitment_message = recruitment_message,
  sc_recruitment_message = recruitment_message,
  ror_recruitment_message = recruitment_message,
  aoc_public_description = public_description,
  sc_public_description = public_description,
  ror_public_description = public_description
WHERE recruitment_open IS NOT NULL OR recruitment_message IS NOT NULL OR public_description IS NOT NULL;

-- Record migration in history
INSERT INTO migration_history (filename) VALUES ('004_per_game_recruitment_settings.sql')
  ON CONFLICT (filename) DO NOTHING;
