# Changelog

## \[Unreleased]

### Added

* **Comprehensive Test Coverage for Discord ID Functions**
  * New test file: `src/lib/__tests__/character-lookup.test.ts` (38 tests)
  * Test coverage for `getCharacterByDiscordId()` - Discord ID lookup with user\_id fallback
  * Test coverage for `getCharactersByDiscordId()` - Multi-character queries
  * Test coverage for `getCurrentUserMainCharacter()` - Main character resolution with dual-path access
  * Test coverage for `checkCharacterResilience()` - Validation for disaster recovery resilience
  * Added `syncDiscordIdToMembers()` tests in `auth.test.ts` (8 tests)
  * All edge cases covered: no auth, missing Discord ID, database errors, non-blocking behaviour
  * 32 new tests added (321 → 353 total tests)
  * All tests passing

* **Discord ID Migration for Disaster Recovery Resilience (2 Consolidated Migrations)**
  * Phase 1 & 2: Schema and data population in single migration
    * Migration: `005_discord_id_schema_and_population.sql` ✅
    * Adds `discord_id` column with indexes
    * Populates from Discord OAuth metadata (auth.users) with identities table fallback
    * Tested on production backup restore: 1 member synced, 12 pending auth linkage
  * Phase 3: App-side Discord sync on login (non-blocking, gradual population)
    * Implementation: `syncDiscordIdToMembers()` in `src/lib/auth.ts` ✅
    * Integrated: `src/app/auth/callback/page.tsx` calls sync after session established ✅
  * Phase 4: Resilient character lookup helpers with dual-path access
    * Created: `src/lib/character-lookup.ts` with Discord ID + user\_id fallback ✅
    * Functions: `getCharacterByDiscordId()`, `getCurrentUserMainCharacter()`, `checkCharacterResilience()`
  * Phase 5: RLS policies with Discord ID-based fallback access
    * Migration: `006_discord_id_rls_policies.sql` ✅
    * New functions: `user_has_clan_role_by_discord()` for Discord-based access checks
    * Updated policies: Members can view/manage via auth UUID or Discord ID
    * Tested: Discord ID fallback working, functions callable
  * Phase 6: Optional - Deprecate user\_id entirely (future work)
  * Impact: Characters remain accessible after database restore even if auth UUID changes

* **Machine-enforced Copilot command compliance system**
  * `.copilot-rules.json`: Declarative rules for OS context, file policies, and violations
  * `validate-copilot-compliance.js`: Pre-commit validation script
  * `.github/workflows/copilot-compliance.yml`: CI workflow running on Windows, Linux, macOS
  * Enforces: OS-appropriate commands, CHANGELOG updates, translation sync
  * Prevents Unix commands (`head`, `grep`) being committed in Windows context
  * Provides clear violation messages with fixes for developers
  * Stops repeating broken patterns across conversations by using external validation

### Changed

* **Brand naming consistency**
  * Updated remaining product name references from "Guild Planner" to "Group Planner" across metadata, Discord webhook text, service worker branding, and project documentation headers

* **Dependency and tooling package bumps**
  * Runtime updates: `next` 16.1.6 → 16.2.6, `react`/`react-dom` 19.2.4 → 19.2.6, `@supabase/supabase-js` 2.94.1 → 2.106.1, `@vercel/analytics` 1.6.1 → 2.0.1, `lucide-react` 0.563.0 → 1.16.0
  * Tooling updates: `typescript` 5.9.3 → 6.0.3, `eslint-config-next` 16.1.6 → 16.2.6, `tsx` 4.21.0 → 4.22.3, `supabase` CLI 2.75.3 → 2.100.1
  * Test and quality tooling updates: `jest` 30.2.0 → 30.4.2, `jest-environment-jsdom` 30.2.0 → 30.4.1, `ts-jest` 29.4.6 → 29.4.10, `cspell` 9.6.4 → 10.0.0, `markdownlint-cli2` 0.20.0 → 0.22.1
  * CI workflow updates: bumped GitHub Actions to latest major versions (`actions/checkout@v6`, `actions/setup-node@v6`, `codecov/codecov-action@v6`, `actions/github-script@v9`, `peter-evans/create-pull-request@v8`) and moved workflow Node runtime to 22

### Fixed

* **Subscriber ships auto-sync reliability**
  * Fixed Star Citizen subscriber tier change handling to compare against the pre-update tier value, ensuring add/remove sync logic runs correctly
  * Added a scheduled background sync endpoint (`/api/sync/subscriber-ships`) to apply current-month subscriber ships for all subscriber characters automatically
  * Added Star Citizen loaner reconciliation to the same sync cycle to check pledged-to-loaner mappings and repair missing/stale auto-managed loaner entries
  * Added Vercel cron schedule to run subscriber ship sync daily and update each character's `subscriber_ships_month`
  * Corrected May 2026 subscriber ship data from RSI post `21023-May-2026-Subscriber-Promotions` (Centurion: Dragonfly Black, Imperator: Cutlass Black + Dragonfly Black)
  * Improved subscriber fetch parser to support current RSI "Centurion Subscribers / Imperator Subscribers" text blocks and map ships to canonical app ship IDs
  * Updated sync skip logic to re-validate existing `subscriber` ownership rows before skipping, so stale May ship rows are repaired even when `subscriber_ships_month` is already current
  * Fixed loaner matrix refresh script to run in Node/tsx environments (removed `Bun.write` dependency), parse current RSI markdown table rows, and normalize ship names to canonical IDs
  * Changed loaner matrix updates to a direct data sync workflow (`npm run update-loaners`) that refreshes `sc_loaner_matrix` from RSI without creating new schema migrations
  * Added preview mode (`npm run update-loaners:preview`) and SQL snapshot output (`scripts/generated/refresh_sc_loaner_matrix.sql`) for auditing/manual fallback
  * Removed accidental generation of `supabase/migrations/070_populate_sc_loaner_matrix.sql`; historical 070 remains in `supabase/migrations_archive/` and baseline source comments only

* **Build type-check regressions after dependency update**
  * Fixed `group_members` insert payload typing in `applyToGroup()` by normalizing payload shape and using `approved_at: null` for pending memberships
  * Fixed `SubscriberTier` type import in `/api/sync/subscriber-ships` to import from `src/lib/subscriberShips.ts` (source of the exported type)
  * Resolved CI lint runtime crash (`react/display-name` / `contextOrFilename.getFilename`) by pinning `eslint` to a Next-compatible v9 release
  * Verified with full local install + production build (`npm install` and `npm run build`)

* Resolved 11 ESLint/TypeScript warnings across 4 files
  * **permissions/route.ts**: Replaced `(upsertError as any)` casting with proper `PostgrestErrorWithDetails` interface
  * **achievements/sync/route.ts**: Prefixed unused `gatheringSkills` variable with underscore
  * **ManageTab.tsx**: Replaced 2x `<img>` tags with Next.js `<Image>` component for improved LCP
  * **CharactersTab.tsx**: Replaced 4x `any` type annotations with proper types (`CharacterData`, `RankLevel`, `CharacterFilters`)
  * **CharactersTab.tsx**: Wrapped 2x hardcoded strings with i18n `t()` function, added translations for `characters.noCharactersFound` across all locales

* **Subscriber ships workflow** - Fixed PR creation and enhanced PR information
  * Organization-level policy updated to allow GitHub Actions to create and approve pull requests
  * Workflow now captures and displays subscriber post URL in PR for easy cross-referencing
  * Automated PR body now includes actual ship names (Centurion and Imperator tier lists)
  * Improved PR details with direct link to RSI source post

* Fixed route configuration and caching issues
  * Corrected Star Citizen route from `/sc/settings` to `/starcitizen/settings`
  * Added documentation that subscriber-ships.ts requires rebuild/redeploy to take effect (config cached at build time)
  * Added warning comment in config file explaining cache invalidation

## \[0.2.0] - 2026-03-09

### Added

* **Automated subscriber ship updates** - GitHub Action that runs monthly to auto-fetch Star Citizen subscriber promotions and create PRs
  * Scheduled workflow runs 1st of each month at 10 AM UTC
  * Scrapes RSI comm-link for current month's subscriber ships
  * Auto-creates PR if successful, or creates reminder issue if fetch fails
  * Significantly reduces manual effort for monthly updates
  * See `docs/STAR_CITIZEN_SUBSCRIBER_UPDATES.md` for details

## \[0.1.3] - 2026-02-13

### Fixed

* Fleet management now allows adding the same ship with different ownership types (e.g., both loaner and pledged MOLE)

## \[0.1.2] - 2026-02-13

### Added

* Version number and build date/time displayed in footer (auto-injected from package.json at build time)
* Version bump enforcement for PRs to main branch (CI check prevents merging without version bump)

### Changed

* Standardized footer across all pages using InlineFooter component (group settings, public group page)
* Ship scraper now filters out paint/skin variants (removed 12 duplicate entries like "Argo Mole Carbon Edition")
* Ships now sorted alphabetically by name instead of by manufacturer

### Fixed

* Markdown linting error (MD024) in CHANGELOG.md by configuring siblings\_only mode for duplicate headings

## \[0.1.1] - 2026-02-12

### Added

* Public groups list on the home page for groups marked public.
* Admin setting to require approval for new members.
* Configurable starting role (trial or member) for new group members.
* Separate Group Settings page accessible from group root (`/[group]/settings`).
* Settings button in group header for admins to access group-wide settings.
* **Automated version management system with changelog validation**
  * `check-changelog.js` script validates CHANGELOG.md is updated with significant code changes
  * `version-bump.js` script automates semver version bumping and CHANGELOG updates with `--commit` flag for one-command releases
  * Pre-commit hook enforces changelog updates for significant changes
  * CI pipeline validates changelog is maintained
  * npm scripts: `version:patch`, `version:minor`, `version:major` for releases
  * Comprehensive [.github/copilot-instructions.md](.github/copilot-instructions.md) for AI assistant workflow automation
* **Automated translation sync validation**
  * `check-translations.js` script ensures all language files (en-GB, es, nl) have matching keys
  * Pre-commit hook prevents commits with out-of-sync translations
  * CI pipeline validates translation consistency
  * npm script: `check:translations` for manual verification
* **Testing infrastructure with Jest and React Testing Library**
* **Phase 1 authentication and permission system test suite: 133 passing tests**
  * Permission system tests (30 tests, 100% coverage)
  * Utility function tests (9 tests, 100% coverage)
  * Game validation tests (8 tests)
  * Authentication system tests (42 tests) - OAuth flows, user profiles, group membership, role management
  * usePermissions hook tests (40 tests) - permission checking, role management, custom overrides, security
* Test patterns for mocking Supabase, React hooks, and async operations
* Testing documentation: TESTING.md, TESTING\_QUICK\_REFERENCE.md, TESTING\_ROADMAP.md
* npm test scripts (test, test:watch, test:coverage) with 50% coverage thresholds
* Missing `guild_bank_manage` permission definition

### Changed

* New joins auto-approve with group-configured role when approval is disabled.
* Manual approval now assigns the group-configured starting role.
* Split settings into Group Settings (recruitment, permissions, games, icon, membership) and Game Settings (game-specific rank management, webhooks).
* Moved member management (accepting/rejecting, role updates, removal) to Group Settings.
* Game-specific settings pages now only show rank management for that game's members.
* Game-specific settings pages now link to Group Settings for group-wide configuration.
* Added `approval_required` and `default_role` flags on groups.

### Fixed

* Restored role colors and creator-first member sorting in member management lists.
* Bug where `guild_bank_manage` permission was referenced but not defined in PERMISSIONS constant
