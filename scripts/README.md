# Scripts

This directory contains utility scripts for the Guild Planner project.

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

## Archived Scripts

The `archived/` subdirectory contains old migration and refactoring scripts that are no longer actively used but kept for reference.
