#!/usr/bin/env node
/**
 * Module Documentation Validator
 *
 * Validates that all API modules are documented in CLAUDE.md and Docs/MODULES.md.
 * Run this script as part of CI to ensure documentation stays in sync with code.
 *
 * Usage: node scripts/validate-module-docs.mjs
 *
 * Exit codes:
 *   0 - All modules are documented
 *   1 - Undocumented modules found
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODULES_DIR = path.join(__dirname, '../apps/api/src/modules');
const CLAUDE_MD = path.join(__dirname, '../../CLAUDE.md');
const MODULES_MD = path.join(__dirname, '../../Docs/MODULES.md');

// Modules that are internal/infrastructure and don't need external documentation
const INTERNAL_MODULES = [
  'feature-flags',
  'module-licensing',
  'monitoring',
  'usage',
  'user-preferences',
];

console.log('📚 Validating module documentation...\n');

// Get all module directories
let modules;
try {
  modules = fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
} catch (error) {
  console.error(`❌ Failed to read modules directory: ${error.message}`);
  process.exit(1);
}

console.log(`Found ${modules.length} modules in ${MODULES_DIR}\n`);

// Read documentation files
let claudeMd, modulesMd;
try {
  claudeMd = fs.readFileSync(CLAUDE_MD, 'utf-8').toLowerCase();
  modulesMd = fs.readFileSync(MODULES_MD, 'utf-8').toLowerCase();
} catch (error) {
  console.error(`❌ Failed to read documentation files: ${error.message}`);
  process.exit(1);
}

const undocumented = [];
const documented = [];

for (const mod of modules) {
  // Skip internal modules
  if (INTERNAL_MODULES.includes(mod)) {
    continue;
  }

  // Convert module name to searchable format (e.g., "finance-tracking" -> "finance")
  const searchTerms = [mod, mod.replace(/-/g, ' '), mod.replace(/-/g, '')];

  const isDocumented = searchTerms.some(
    (term) => claudeMd.includes(term) || modulesMd.includes(term)
  );

  if (isDocumented) {
    documented.push(mod);
  } else {
    undocumented.push(mod);
  }
}

// Report results
console.log('✅ Documented modules:');
documented.forEach((m) => console.log(`   - ${m}`));
console.log();

if (undocumented.length > 0) {
  console.log('❌ Undocumented modules:');
  undocumented.forEach((m) => console.log(`   - ${m}`));
  console.log();
  console.log('Please add documentation for these modules to:');
  console.log('  - CLAUDE.md (for AI assistant reference)');
  console.log('  - Docs/MODULES.md (for module configuration)');
  process.exit(1);
} else {
  console.log('✅ All user-facing modules are documented!\n');
  console.log(
    `Skipped ${INTERNAL_MODULES.length} internal modules: ${INTERNAL_MODULES.join(', ')}`
  );
  process.exit(0);
}
