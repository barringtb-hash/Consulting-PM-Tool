#!/usr/bin/env node
/**
 * CLAUDE.md Reference Validator
 *
 * Validates that file paths referenced in CLAUDE.md still exist.
 * This catches stale documentation when files are moved or deleted.
 *
 * Usage: node scripts/validate-claude-md.mjs
 *
 * Exit codes:
 *   0 - All file references are valid
 *   1 - Some file references are broken
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLAUDE_MD = path.join(__dirname, '../../CLAUDE.md');
const ROOT_DIR = path.join(__dirname, '../..');

console.log('📚 Validating CLAUDE.md file references...\n');

// Read CLAUDE.md
let content;
try {
  content = fs.readFileSync(CLAUDE_MD, 'utf-8');
} catch (error) {
  console.error(`❌ Failed to read CLAUDE.md: ${error.message}`);
  process.exit(1);
}

// Extract file paths from CLAUDE.md
// Match patterns like `pmo/apps/api/src/...` or `pmo/prisma/...`
const pathRegex = /`(pmo\/[^`\s]+\.(ts|tsx|prisma|json|mjs|sh))`/g;
const matches = [...content.matchAll(pathRegex)];
const paths = [...new Set(matches.map((m) => m[1]))]; // Deduplicate

console.log(`Found ${paths.length} file references in CLAUDE.md\n`);

const valid = [];
const missing = [];

for (const p of paths) {
  const fullPath = path.join(ROOT_DIR, p);
  if (fs.existsSync(fullPath)) {
    valid.push(p);
  } else {
    missing.push(p);
  }
}

// Report results
if (valid.length > 0) {
  console.log(`✅ Valid references: ${valid.length}`);
}

if (missing.length > 0) {
  console.log(`\n❌ Broken references (${missing.length}):`);
  missing.forEach((p) => console.log(`   - ${p}`));
  console.log('\nPlease update CLAUDE.md to fix these broken references.');
  console.log('Files may have been moved, renamed, or deleted.');
  process.exit(1);
} else {
  console.log('\n✅ All file references in CLAUDE.md are valid!\n');
  process.exit(0);
}
