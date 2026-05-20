# Scripts

This directory contains utility scripts for the Group Planner project.

## Available Scripts

### `check-translations.js`

**Purpose:** Validates that all translation files are in sync (have the same keys).

**Usage:**

```bash
npm run check:translations
```

**What it checks:**

* All translation files (`en-GB.json`, `es.json`, `nl.json`) have the exact same set of keys
* Reports missing keys in each language file
* Exits with code 1 if any keys are missing (fails CI/pre-commit)

**When it runs:**

* Automatically in CI pipeline (GitHub Actions)
* Automatically on Git commit (via Husky pre-commit hook)
* Manually via `npm run check:translations`

**Output:**

* ✅ Success: All files have matching keys
* ❌ Failure: Lists missing keys per language file

***

### `check-changelog.js`

**Purpose:** Ensures CHANGELOG.md is updated when significant code changes are made.

**Usage:**

```bash
npm run check:changelog
```

**What it checks:**

* Detects significant code changes (src, components, migrations, config, etc.)
* Verifies that CHANGELOG.md has content in the `[Unreleased]` section
* Ignores non-significant changes (docs, tests, config files)
* Exits with code 1 if significant changes exist without changelog updates

**When it runs:**

* Automatically in CI pipeline (GitHub Actions)
* Automatically on Git commit (via Husky pre-commit hook)
* Manually via `npm run check:changelog`

**Output:**

* ✅ Success: CHANGELOG.md is updated or no significant changes
* ❌ Failure: Significant changes detected but CHANGELOG.md is empty

**Excluded from check:**

* Documentation files (\*.md)
* Test files (\*.test.\*, \*.spec.\*)
* Configuration files (eslint, jest, tsconfig, etc.)
* GitHub workflow files
* Scripts directory (except significant changes)

***

### `version-bump.js`

**Purpose:** Automates version bumping and CHANGELOG.md updates for releases.

**Usage:**

```bash
npm run version:patch  # 0.1.0 → 0.1.1
npm run version:minor  # 0.1.0 → 0.2.0
npm run version:major  # 0.1.0 → 1.0.0

# With auto-commit and tag:
npm run version:patch -- --commit
npm run version:minor -- --commit
npm run version:major -- --commit
```

**What it does:**

1. Validates that CHANGELOG.md has `[Unreleased]` content
2. Bumps the version in package.json according to semver
3. Moves `[Unreleased]` section in CHANGELOG.md to new version with date
4. **With --commit flag**: Automatically stages, commits, and tags the changes

**Workflow (simplified with --commit):**

1. Make changes and update CHANGELOG.md under `[Unreleased]`
2. When ready to release: `npm run version:patch -- --commit`
3. Push: `git push && git push --tags`

**Workflow (manual):**

1. Make changes and update CHANGELOG.md under `[Unreleased]`
2. Run: `npm run version:patch` (or minor/major)
3. Review the changes to package.json and CHANGELOG.md
4. Commit: `git add package.json CHANGELOG.md`
5. Commit: `git commit -m "chore: bump version to X.Y.Z"`
6. Tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
7. Push: `git push && git push --tags`

**Version types:**

* **patch**: Bug fixes, small changes (0.0.X)
* **minor**: New features, backwards-compatible (0.X.0)
* **major**: Breaking changes (X.0.0)

***

### `validate-copilot-compliance.js`

**Purpose:** Validates GitHub Copilot command compliance with OS context and project rules.

**Usage:**

```bash
node scripts/validate-copilot-compliance.js
```

**What it checks:**

* **OS Command Policy**: Ensures commands match the current OS (Windows PowerShell, Linux/macOS bash)
* **CHANGELOG Updates**: Verifies `[Unreleased]` section is not empty for code changes
* **Translation Sync**: Ensures all translation files have matching keys
* **Rules Consistency**: Validates `.copilot-rules.json` format and enforceability

**When it runs:**

* Automatically in pre-commit hook (blocks commits if violations found)
* Automatically in CI pipeline on all OS contexts (`.github/workflows/copilot-compliance.yml`)
* Manually for debugging

**What it prevents:**

* Unix commands (`head`, `grep`, `tail`, etc.) being committed in Windows context
* Empty CHANGELOG entries blocking CI
* Out-of-sync translation files
* Violations of rules defined in `.copilot-rules.json`

**Output:**

* ✅ Success: All compliance checks pass
* ❌ Failure: Lists specific violations with fixes

**Configuration:**

Rules are defined in `.copilot-rules.json` and include:

* OS-specific command blocking
* File change policies (what requires CHANGELOG/translation updates)
* Tool usage enforcement (multi-replace, parallel operations)
* Violation examples with fixes

**For Developers:**

This script ensures consistency across different development machines (Windows, macOS, Linux). If you see violations:

1. **Unix command on Windows**: Use PowerShell equivalents (`Select-Object`, `Select-String`, etc.)
2. **CHANGELOG not updated**: Add entries under `## [Unreleased]` or use `npm run version:patch`
3. **Translations out of sync**: Run `npm run check:translations` to see mismatches

***

### `generate-migration-list.js`

**Purpose:** Generates a JSON list of migration files for runtime validation.

**Usage:** Automatically runs before build.

***

### `fetch-ships.js`

**Purpose:** Updates Star Citizen ship data from external sources.

**Usage:**

```bash
npm run update-ships
```

***

### `fetch-subscriber-ships.ts`

**Purpose:** Automatically fetches monthly Star Citizen subscriber ship promotions from RSI and updates the configuration.

**Usage:**

```bash
# Manual run (useful for testing or immediate updates)
bun run scripts/fetch-subscriber-ships.ts

# Automatic (via GitHub Action every 1st of month at 10 AM UTC)
# See `.github/workflows/update-subscriber-ships.yml`
```

**What it does:**

1. Finds the current month's subscriber promotions post on RSI comm-link
2. Scrapes the page to extract Centurion and Imperator ships
3. Maps ship names to ship IDs using configured database
4. Updates `src/games/starcitizen/config/subscriber-ships.ts`
5. Returns success/failure status for GitHub Action

**How it's used:**

* **Primary**: Automated by GitHub Action (`.github/workflows/update-subscriber-ships.yml`)
* **Secondary**: Run manually if immediate update is needed
* **Fallback**: If scraping fails, GitHub Action creates an issue for manual update

**Exit codes:**

* `0` = Success (ships updated or already up-to-date)
* `1` = Failure (could not fetch or parse promotions)

**Output:**

* Logs fetching progress
* Prints extracted ships on success
* Logs errors and explains issues

**Dependencies:**

* `cheerio` - HTML parsing
* `node-fetch` - HTTP requests

For details: See `docs/STAR_CITIZEN_SUBSCRIBER_UPDATES.md`

***
