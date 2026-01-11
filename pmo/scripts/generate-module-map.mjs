#!/usr/bin/env node
/**
 * Module Map Generator
 *
 * Generates a comprehensive module map documentation file.
 * This provides a quick reference of all modules, their components,
 * and their documentation status.
 *
 * Usage: node scripts/generate-module-map.mjs
 *
 * Output: Docs/MODULE-MAP.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODULES_DIR = path.join(__dirname, '../apps/api/src/modules');
const SERVICES_DIR = path.join(__dirname, '../apps/api/src/services');
const CRM_DIR = path.join(__dirname, '../apps/api/src/crm');
const PAGES_DIR = path.join(__dirname, '../apps/web/src/pages');
const OUTPUT_FILE = path.join(__dirname, '../../Docs/MODULE-MAP.md');

console.log('🗺️  Generating module map...\n');

const today = new Date().toISOString().split('T')[0];

// Scan API modules
const modules = fs
  .readdirSync(MODULES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const modPath = path.join(MODULES_DIR, d.name);
    const files = fs.readdirSync(modPath, { recursive: true });

    return {
      name: d.name,
      hasRouter: files.some((f) => f.toString().includes('router')),
      hasService: files.some((f) => f.toString().includes('service')),
      fileCount: files.filter((f) => f.toString().endsWith('.ts')).length,
    };
  });

// Scan core services
const coreServices = fs
  .readdirSync(SERVICES_DIR)
  .filter((f) => f.endsWith('.service.ts'))
  .map((f) => f.replace('.service.ts', ''));

// Scan CRM services
let crmServices = [];
const crmServicesDir = path.join(CRM_DIR, 'services');
if (fs.existsSync(crmServicesDir)) {
  crmServices = fs
    .readdirSync(crmServicesDir)
    .filter((f) => f.endsWith('.service.ts'))
    .map((f) => f.replace('.service.ts', ''));
}

// Scan pages
const scanPages = (dir, prefix = '') => {
  const items = [];
  if (!fs.existsSync(dir)) return items;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      items.push(...scanPages(path.join(dir, entry.name), `${prefix}${entry.name}/`));
    } else if (entry.name.endsWith('Page.tsx')) {
      items.push(`${prefix}${entry.name.replace('.tsx', '')}`);
    }
  }
  return items;
};

const pages = scanPages(PAGES_DIR);

// Generate markdown
let output = `# Module Map

> Auto-generated on ${today}
>
> Run \`node pmo/scripts/generate-module-map.mjs\` to regenerate

---

## Summary

| Category | Count |
|----------|-------|
| API Modules | ${modules.length} |
| Core Services | ${coreServices.length} |
| CRM Services | ${crmServices.length} |
| Frontend Pages | ${pages.length} |

---

## API Modules (${modules.length})

| Module | Router | Service | Files | Status |
|--------|:------:|:-------:|:-----:|--------|
`;

// Categorize modules
const phase1 = ['chatbot', 'product-descriptions', 'scheduling', 'intake'];
const phase2 = ['document-analyzer', 'content-generator', 'lead-scoring', 'prior-auth'];
const phase3 = [
  'inventory-forecasting',
  'compliance-monitor',
  'predictive-maintenance',
  'revenue-management',
  'safety-monitor',
];

for (const mod of modules.sort((a, b) => a.name.localeCompare(b.name))) {
  let category = 'Core';
  if (phase1.includes(mod.name)) category = 'AI Phase 1';
  else if (phase2.includes(mod.name)) category = 'AI Phase 2';
  else if (phase3.includes(mod.name)) category = 'AI Phase 3';

  output += `| ${mod.name} | ${mod.hasRouter ? '✅' : '❌'} | ${mod.hasService ? '✅' : '❌'} | ${mod.fileCount} | ${category} |\n`;
}

output += `
---

## Core Services (${coreServices.length})

| Service | Purpose |
|---------|---------|
`;

const serviceDescriptions = {
  asset: 'AI asset management (prompts, workflows, datasets)',
  audit: 'Audit logging for compliance',
  client: 'Legacy client CRUD operations',
  document: 'Document upload and management',
  lead: 'Lead management and conversion to opportunities',
  llm: 'LLM integration (OpenAI)',
  meeting: 'Meeting scheduling and notes',
  milestone: 'Project milestone tracking',
  notification: 'Notification dispatch (email, in-app)',
  project: 'Project management and templates',
  search: 'Full-text search across entities',
  task: 'Task CRUD and Kanban operations',
  user: 'User management and authentication',
};

for (const svc of coreServices.sort()) {
  output += `| ${svc} | ${serviceDescriptions[svc] || '-'} |\n`;
}

output += `
---

## CRM Services (${crmServices.length})

| Service | Purpose |
|---------|---------|
`;

const crmDescriptions = {
  account: 'Account CRUD, hierarchy, merge operations',
  activity: 'Activity timeline management',
  opportunity: 'Sales pipeline and opportunity tracking',
};

for (const svc of crmServices.sort()) {
  output += `| ${svc} | ${crmDescriptions[svc] || '-'} |\n`;
}

output += `
---

## Frontend Pages (${pages.length})

| Category | Pages |
|----------|-------|
`;

// Group pages by directory
const pageGroups = {};
for (const page of pages) {
  const parts = page.split('/');
  const category = parts.length > 1 ? parts[0] : 'root';
  if (!pageGroups[category]) pageGroups[category] = [];
  pageGroups[category].push(parts[parts.length - 1]);
}

for (const [category, categoryPages] of Object.entries(pageGroups).sort()) {
  output += `| ${category} | ${categoryPages.join(', ')} |\n`;
}

output += `
---

## Module Categories

### AI Tools - Phase 1 (Customer Automation)
${phase1.map((m) => `- \`${m}\``).join('\n')}

### AI Tools - Phase 2 (Business Intelligence)
${phase2.map((m) => `- \`${m}\``).join('\n')}

### AI Tools - Phase 3 (Industry-Specific)
${phase3.map((m) => `- \`${m}\``).join('\n')}

---

*Generated by \`generate-module-map.mjs\`*
`;

// Write output
fs.writeFileSync(OUTPUT_FILE, output);
console.log(`✅ Module map generated: ${OUTPUT_FILE}`);
console.log(`   - ${modules.length} API modules`);
console.log(`   - ${coreServices.length} core services`);
console.log(`   - ${crmServices.length} CRM services`);
console.log(`   - ${pages.length} frontend pages`);
