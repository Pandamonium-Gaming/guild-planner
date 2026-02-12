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
