#!/usr/bin/env node

/**
 * Check Changelog Updates
 * 
 * Ensures that when relevant code changes are made, the CHANGELOG.md is updated.
 * This prevents forgetting to document changes.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHANGELOG_PATH = path.join(__dirname, '..', 'CHANGELOG.md');

// Files/directories that don't require changelog updates
const EXCLUDED_PATTERNS = [
  /^\.github\//,
  /^\.husky\//,
  /^docs\//,
  /\.md$/,
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /^__tests__\//,
  /^__mocks__\//,
  /^coverage\//,
  /^scripts\/check-/,
  /^scripts\/README\.md$/,
  /eslint\.config/,
  /jest\.config/,
  /tsconfig\.json$/,
  /\.prettierrc$/,
  /\.gitignore$/,
  /cspell\.json$/,
];

// Patterns that DO require changelog updates
const SIGNIFICANT_PATTERNS = [
  /^src\//,
  /^supabase\/migrations\//,
  /^public\//,
  /^app\//,
  /^components\//,
  /^lib\//,
  /^pages\//,
  /package\.json$/,
  /next\.config/,
];

/**
 * Check if a file path is significant (requires changelog update)
 */
function isSignificantChange(filePath) {
  // Exclude non-significant changes
  if (EXCLUDED_PATTERNS.some(pattern => pattern.test(filePath))) {
    return false;
  }
  
  // Check if it matches significant patterns
  return SIGNIFICANT_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Get changed files from git
 */
function getChangedFiles() {
  try {
    // Get staged files
    const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
    
    // Get unstaged files
    const unstaged = execSync('git diff --name-only', { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
    
    // Combine and deduplicate
    return [...new Set([...staged, ...unstaged])];
  } catch (error) {
    // If git commands fail, we're probably not in a git repo or have no changes
    return [];
  }
}

/**
 * Check if CHANGELOG has unreleased content
 */
function hasUnreleasedChanges() {
  try {
    const changelog = fs.readFileSync(CHANGELOG_PATH, 'utf8');
    
    // Find the [Unreleased] section using string indexOf (more reliable than regex)
    const unreleasedStart = changelog.indexOf('## \\[Unreleased]');
    
    if (unreleasedStart < 0) {
      return false;
    }
    
    // Find the next section (or end of file)
    const nextSection = changelog.indexOf('\n## \\[', unreleasedStart + 10);
    const endPos = nextSection > 0 ? nextSection : changelog.length;
    
    const unreleasedSection = changelog.substring(unreleasedStart, endPos);
    
    // Check if there's actual content (not just whitespace or empty headers)
    const contentLines = unreleasedSection
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        // Ignore empty lines, section headers (### Added, ### Changed, etc.)
        return trimmed && !trimmed.startsWith('#');
      });
    
    return contentLines.length > 0;
  } catch (error) {
    console.error('❌ Error reading CHANGELOG.md:', error.message);
    return false;
  }
}

// Main execution
const changedFiles = getChangedFiles();

if (changedFiles.length === 0) {
  console.log('📝 No changes detected, skipping changelog check');
  process.exit(0);
}

const significantChanges = changedFiles.filter(isSignificantChange);

if (significantChanges.length === 0) {
  console.log('📝 No significant changes detected, skipping changelog check');
  process.exit(0);
}

console.log(`📝 Found ${significantChanges.length} significant change(s):`);
significantChanges.slice(0, 5).forEach(file => console.log(`   - ${file}`));
if (significantChanges.length > 5) {
  console.log(`   ... and ${significantChanges.length - 5} more`);
}

if (!hasUnreleasedChanges()) {
  console.error('\n❌ CHANGELOG.md needs updating!');
  console.error('\nYou have significant code changes but the [Unreleased] section');
  console.error('in CHANGELOG.md appears to be empty.\n');
  console.error('Please document your changes under the appropriate section:');
  console.error('  - ### Added (for new features)');
  console.error('  - ### Changed (for changes to existing functionality)');
  console.error('  - ### Deprecated (for soon-to-be removed features)');
  console.error('  - ### Removed (for removed features)');
  console.error('  - ### Fixed (for bug fixes)');
  console.error('  - ### Security (for security-related changes)\n');
  process.exit(1);
}

console.log('✅ CHANGELOG.md has unreleased changes documented');
process.exit(0);
