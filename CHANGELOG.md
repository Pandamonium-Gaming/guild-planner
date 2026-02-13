# Changelog

## \[Unreleased]

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
