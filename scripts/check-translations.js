#!/usr/bin/env node

/**
 * Check translation sync
 * 
 * Verifies that all translation files (en-GB, es, nl) have the same keys.
 * Exits with code 1 if any keys are missing from any file.
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'public', 'locales');
const LOCALE_FILES = {
  'en-GB': path.join(LOCALES_DIR, 'en-GB.json'),
  'es': path.join(LOCALES_DIR, 'es.json'),
  'nl': path.join(LOCALES_DIR, 'nl.json')
};

/**
 * Recursively get all keys from a nested object
 */
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Load and parse a JSON file
 */
function loadLocale(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error loading ${filePath}:`, error.message);
    process.exit(1);
  }
}

// Load all locale files
const locales = {};
for (const [name, filePath] of Object.entries(LOCALE_FILES)) {
  locales[name] = loadLocale(filePath);
}

// Get all keys from each locale
const keys = {};
for (const [name, data] of Object.entries(locales)) {
  keys[name] = getAllKeys(data).sort();
}

// Find all unique keys across all locales
const allKeysSet = new Set();
for (const keyList of Object.values(keys)) {
  keyList.forEach(key => allKeysSet.add(key));
}

// Check for missing keys
const missing = {};
let hasMissing = false;

for (const [name, keyList] of Object.entries(keys)) {
  missing[name] = [];
  for (const key of allKeysSet) {
    if (!keyList.includes(key)) {
      missing[name].push(key);
      hasMissing = true;
    }
  }
}

// Output results
console.log('📊 Translation Keys Summary:');
for (const [name, keyList] of Object.entries(keys)) {
  console.log(`  ${name}: ${keyList.length} keys`);
}
console.log();

if (hasMissing) {
  console.error('❌ Translation files are out of sync!\n');
  
  for (const [name, missingKeys] of Object.entries(missing)) {
    if (missingKeys.length > 0) {
      console.error(`Missing in ${name} (${missingKeys.length}):`);
      missingKeys.forEach(key => console.error(`  - ${key}`));
      console.error();
    }
  }
  
  process.exit(1);
} else {
  console.log('✅ All translation files are in sync!');
  process.exit(0);
}
