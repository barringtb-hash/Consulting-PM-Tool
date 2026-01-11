# Code Review & Documentation Maintenance Plan

## Executive Summary

This plan establishes a comprehensive approach to:
1. **Review and validate** all codebase documentation
2. **Map all modules, database, and connections** for complete visibility
3. **Implement automation rules** to keep documentation updated after every commit/PR

**Current State:** The codebase was previously audited (score 9.5/10) but lacks automated documentation validation and freshness enforcement.

---

## Part 1: Current State Analysis

### Existing Documentation Inventory

| Category | Files | Status |
|----------|-------|--------|
| Main Guide | `CLAUDE.md` | ✅ Comprehensive (600+ lines) |
| API Docs | `Docs/AI-Tools.md`, `Docs/meetings-api.md` | ✅ Current |
| Architecture | `Docs/CRM-TRANSFORMATION-PLAN.md`, `Docs/AI_Consulting_PMO_Implementation_Codex.md` | ✅ Complete |
| Modules | `Docs/MODULES.md` | ✅ Accurate |
| Finance | `Docs/FINANCE-TRACKING-PLAN.md` | ✅ Complete |
| Tech Debt | `Docs/TECHNICAL-DEBT-REPORT.md` | ✅ Maintained |
| Deployment | `Docs/deploy-notes-render-vercel.md`, `Docs/render-platform-guide.md` | ✅ Accurate |
| Previous Audits | `DOCUMENTATION-REVIEW-PLAN.md`, `DOCUMENTATION-AUDIT-MASTER-REPORT.md` | ✅ Complete |

### Existing Automation

| Tool | Purpose | Docs Coverage |
|------|---------|---------------|
| GitHub CI (`ci.yml`) | Lint, test, build | ❌ No doc validation |
| Claude Code Review (`claude-review.yml`) | PR code review | ❌ No doc checks |
| Husky pre-commit | Format/lint staged files | ❌ No doc updates |
| lint-staged | Prettier + ESLint | ❌ No doc scope |

### Identified Gaps

1. **No automated documentation validation** - Docs can become stale without detection
2. **No module registry synchronization** - New modules not auto-documented
3. **No database schema documentation sync** - Prisma changes not reflected in docs
4. **No API endpoint documentation generation** - Manual maintenance required
5. **No PR template enforcing doc updates** - Contributors skip documentation

---

## Part 2: Codebase Module Mapping

### API Modules (30 Total)

```
pmo/apps/api/src/modules/
├── ai-monitoring/          # AI model monitoring & metrics
├── brand-profiles/         # Brand identity management
├── bug-tracking/           # Issue tracking system
├── campaigns/              # Marketing campaigns
├── chatbot/                # AI Chatbot (Phase 1)
├── compliance-monitor/     # Regulatory compliance (Phase 3)
├── content-generator/      # AI content creation (Phase 2)
├── customer-success/       # Customer health & engagement
├── document-analyzer/      # Document OCR/analysis (Phase 2)
├── feature-flags/          # Feature toggle system
├── finance-tracking/       # Expenses, budgets, forecasting
├── intake/                 # Client intake forms (Phase 1)
├── inventory-forecasting/  # Inventory prediction (Phase 3)
├── lead-scoring/           # Lead qualification (Phase 2)
├── marketing/              # Marketing content management
├── mcp/                    # Model Context Protocol
├── meetings/               # Meeting management
├── module-licensing/       # Module access control
├── monitoring/             # System monitoring
├── predictive-maintenance/ # Equipment maintenance (Phase 3)
├── prior-auth/             # Prior authorization (Phase 2)
├── product-descriptions/   # AI product copy (Phase 1)
├── publishing/             # Content publishing
├── revenue-management/     # Revenue optimization (Phase 3)
├── safety-monitor/         # Safety compliance (Phase 3)
├── scheduling/             # Appointment scheduling (Phase 1)
├── usage/                  # Usage tracking
└── user-preferences/       # User settings
```

### Core Services

```
pmo/apps/api/src/services/
├── asset.service.ts        # AI asset management
├── audit.service.ts        # Audit logging
├── client.service.ts       # Client CRUD
├── document.service.ts     # Document handling
├── lead.service.ts         # Lead management & conversion
├── llm.service.ts          # LLM integration (OpenAI)
├── meeting.service.ts      # Meeting operations
├── milestone.service.ts    # Milestone tracking
├── notification.service.ts # Notification dispatch
├── project.service.ts      # Project management
├── search.service.ts       # Search functionality
├── task.service.ts         # Task CRUD & Kanban
└── user.service.ts         # User management
```

### CRM Module

```
pmo/apps/api/src/crm/
├── services/
│   ├── account.service.ts     # Account CRUD, hierarchy, merge
│   ├── activity.service.ts    # Activity timeline
│   └── opportunity.service.ts # Sales pipeline
└── routes/
    ├── account.routes.ts      # Account API endpoints
    ├── activity.routes.ts     # Activity API endpoints
    └── opportunity.routes.ts  # Opportunity API endpoints
```

### Database Schema Models

**Total Models:** 50+ (7,090 lines in schema.prisma)

| Category | Models |
|----------|--------|
| **Core PMO** | User, Tenant, Client, Project, Task, Milestone, Meeting, Document |
| **CRM** | Account, CRMContact, Opportunity, Pipeline, SalesPipelineStage, CRMActivity, OpportunityContact, OpportunityStageHistory |
| **AI Chatbot** | ChatbotConfig, ChatConversation, ChatMessage, KnowledgeBaseItem, WebhookConfig, ChannelConfig, ChatAnalytics |
| **Document Analyzer** | DocumentAnalyzerConfig, AnalyzedDocument, ExtractionTemplate, DocumentIntegration, BatchJob |
| **Finance** | ExpenseCategory, Expense, Budget, RecurringCost |
| **Customer Success** | SuccessPlan, CTA, Playbook, EngagementEvent |
| **Marketing** | MarketingContent, Campaign, BrandProfile |
| **Bug Tracking** | BugTrackingIssue, IssueComment, RuntimeError |

### Frontend Pages (52 Total)

| Category | Count | Pages |
|----------|-------|-------|
| Dashboard | 2 | DashboardPage, ExecutiveDashboardPage |
| CRM | 4 | AccountsPage, AccountDetailPage, OpportunitiesPage, OpportunityDetailPage |
| Finance | 8 | FinanceDashboardPage, ExpensesPage, BudgetsPage, RecurringCostsPage, etc. |
| AI Tools | 13 | ChatbotPage, DocumentAnalyzerPage, LeadScoringPage, etc. |
| Admin | 4 | TenantsPage, AdminPage, etc. |
| PMO | 12 | ProjectsPage, TasksPage, MilestonesPage, etc. |
| Other | 9 | SettingsPage, ProfilePage, etc. |

---

## Part 3: Documentation Automation Rules

### Rule 1: PR Documentation Checklist (Required)

Create a PR template that enforces documentation updates:

**File:** `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## Documentation Checklist

Before submitting this PR, confirm the following:

### Required for All PRs
- [ ] Code changes have appropriate inline comments
- [ ] Complex logic includes explanatory comments
- [ ] Public functions have JSDoc documentation

### Required When Applicable
- [ ] **New API Endpoints:** Updated `CLAUDE.md` API reference table
- [ ] **New Module:** Added entry to `Docs/MODULES.md`
- [ ] **Database Changes:** Updated relevant schema documentation
- [ ] **New Page/Feature:** Updated feature documentation
- [ ] **Breaking Changes:** Added migration notes to relevant docs
- [ ] **Configuration Changes:** Updated environment variable docs

### Verification
- [ ] I have read the documentation guidelines in `CLAUDE.md`
- [ ] I have tested that existing documentation remains accurate
```

### Rule 2: Documentation Validation CI Job

Add a new GitHub Actions job to validate documentation:

**File:** `.github/workflows/docs-validation.yml`

```yaml
name: Documentation Validation

on:
  pull_request:
    paths:
      - 'pmo/apps/api/src/**'
      - 'pmo/apps/web/src/**'
      - 'pmo/prisma/schema.prisma'
      - 'Docs/**'
      - 'CLAUDE.md'

jobs:
  validate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Check for undocumented modules
        run: |
          echo "Checking for undocumented modules..."
          node scripts/validate-module-docs.mjs

      - name: Check CLAUDE.md freshness
        run: |
          echo "Validating CLAUDE.md references..."
          node scripts/validate-claude-md.mjs

      - name: Check for missing JSDoc on new files
        run: |
          echo "Checking JSDoc coverage on changed files..."
          node scripts/check-jsdoc-coverage.mjs
```

### Rule 3: Pre-commit Documentation Hook

Extend the Husky pre-commit to check documentation:

**File:** `pmo/.husky/pre-commit` (updated)

```bash
#!/usr/bin/env sh
cd "$(dirname "$0")/.."

# Run lint-staged (formatting/linting)
npx lint-staged

# Check if Prisma schema changed and remind about docs
if git diff --cached --name-only | grep -q "schema.prisma"; then
  echo "⚠️  Prisma schema modified. Remember to update CLAUDE.md database section if needed."
fi

# Check if new module added
if git diff --cached --name-only | grep -q "modules/.*\.ts"; then
  echo "⚠️  Module files changed. Ensure Docs/MODULES.md is updated."
fi
```

### Rule 4: Claude Code Review Documentation Check

Update the Claude review workflow to check docs:

**File:** `.github/workflows/claude-review.yml` (updated)

```yaml
name: Claude Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - name: React with eyes emoji
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body: '👀 Claude is reviewing this PR...'
            });

      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Claude Code Review
        uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            Review this PR for:

            ## Code Quality
            - Potential bugs or issues
            - Security concerns
            - Performance issues

            ## Documentation Requirements
            - Check if new public functions have JSDoc comments
            - Check if new API endpoints are documented
            - Check if CLAUDE.md needs updates for:
              - New modules or features
              - New API endpoints
              - Database schema changes
              - New environment variables
            - Check if Docs/MODULES.md needs updates for new modules

            ## Response Format
            - If you find issues, list them clearly with:
              - 🐛 Bug/Issue: [description]
              - 📝 Missing Docs: [what needs documenting]
              - ⚠️ Security: [concern]
            - If everything looks good, start with 👍 and approval message
```

### Rule 5: Documentation Sync Scripts

Create validation scripts for automation:

**File:** `pmo/scripts/validate-module-docs.mjs`

```javascript
#!/usr/bin/env node
/**
 * Validates that all API modules are documented in CLAUDE.md and Docs/MODULES.md
 */

import fs from 'fs';
import path from 'path';

const MODULES_DIR = './apps/api/src/modules';
const CLAUDE_MD = '../CLAUDE.md';
const MODULES_MD = '../Docs/MODULES.md';

// Get all module directories
const modules = fs.readdirSync(MODULES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

// Read documentation files
const claudeMd = fs.readFileSync(CLAUDE_MD, 'utf-8');
const modulesMd = fs.readFileSync(MODULES_MD, 'utf-8');

const undocumented = [];

for (const mod of modules) {
  // Check if module is mentioned in either doc
  if (!claudeMd.includes(mod) && !modulesMd.includes(mod)) {
    undocumented.push(mod);
  }
}

if (undocumented.length > 0) {
  console.error('❌ Undocumented modules found:');
  undocumented.forEach(m => console.error(`   - ${m}`));
  process.exit(1);
} else {
  console.log('✅ All modules are documented');
}
```

**File:** `pmo/scripts/validate-claude-md.mjs`

```javascript
#!/usr/bin/env node
/**
 * Validates CLAUDE.md references are still valid
 */

import fs from 'fs';
import path from 'path';

const CLAUDE_MD = '../CLAUDE.md';

const content = fs.readFileSync(CLAUDE_MD, 'utf-8');

// Extract file paths from CLAUDE.md
const pathRegex = /`(pmo\/[^`]+\.(ts|tsx|prisma))`/g;
const paths = [...content.matchAll(pathRegex)].map(m => m[1]);

const missing = [];

for (const p of paths) {
  const fullPath = path.join('..', p);
  if (!fs.existsSync(fullPath)) {
    missing.push(p);
  }
}

if (missing.length > 0) {
  console.error('❌ CLAUDE.md references non-existent files:');
  missing.forEach(p => console.error(`   - ${p}`));
  process.exit(1);
} else {
  console.log('✅ All CLAUDE.md file references are valid');
}
```

**File:** `pmo/scripts/generate-module-map.mjs`

```javascript
#!/usr/bin/env node
/**
 * Generates a module dependency map for documentation
 */

import fs from 'fs';
import path from 'path';

const MODULES_DIR = './apps/api/src/modules';
const OUTPUT_FILE = '../Docs/MODULE-MAP.md';

const modules = fs.readdirSync(MODULES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

let output = `# Module Map

> Auto-generated on ${new Date().toISOString().split('T')[0]}

## API Modules (${modules.length})

| Module | Router | Service | Description |
|--------|--------|---------|-------------|
`;

for (const mod of modules) {
  const modPath = path.join(MODULES_DIR, mod);
  const files = fs.readdirSync(modPath);

  const hasRouter = files.some(f => f.includes('router'));
  const hasService = files.some(f => f.includes('service'));

  output += `| ${mod} | ${hasRouter ? '✅' : '❌'} | ${hasService ? '✅' : '❌'} | - |\n`;
}

fs.writeFileSync(OUTPUT_FILE, output);
console.log(`✅ Module map generated: ${OUTPUT_FILE}`);
```

---

## Part 4: Documentation Standards & Guidelines

### JSDoc Requirements

All public functions must include:

```typescript
/**
 * Brief description of what the function does
 *
 * @param paramName - Description of parameter
 * @returns Description of return value
 * @throws {ErrorType} When [condition]
 * @example
 * const result = await functionName(param);
 */
```

### Module Documentation Requirements

Each module directory should have:
1. **File-level JSDoc** in main router/service files
2. **README.md** (optional but recommended for complex modules)
3. **Entry in `Docs/MODULES.md`**
4. **Reference in `CLAUDE.md`** if user-facing

### Database Schema Documentation

Prisma models should include:
1. **Model-level comments** explaining purpose
2. **Deprecation notices** with migration paths
3. **Field comments** for non-obvious fields

### API Endpoint Documentation

For each endpoint group, maintain:
1. **Endpoint table in CLAUDE.md** with method, path, description
2. **Request/response examples** for complex endpoints
3. **Authentication requirements**

---

## Part 5: Implementation Roadmap

### Phase 1: Foundation (Week 1)

| Task | Owner | Status |
|------|-------|--------|
| Create PR template with doc checklist | TBD | ⬜ Pending |
| Update pre-commit hook for doc reminders | TBD | ⬜ Pending |
| Create `validate-module-docs.mjs` script | TBD | ⬜ Pending |
| Create `validate-claude-md.mjs` script | TBD | ⬜ Pending |

### Phase 2: Automation (Week 2)

| Task | Owner | Status |
|------|-------|--------|
| Create docs-validation GitHub workflow | TBD | ⬜ Pending |
| Update claude-review workflow for doc checks | TBD | ⬜ Pending |
| Create `generate-module-map.mjs` script | TBD | ⬜ Pending |
| Add documentation CI badge to README | TBD | ⬜ Pending |

### Phase 3: Mapping & Verification (Week 3)

| Task | Owner | Status |
|------|-------|--------|
| Generate complete module map | TBD | ⬜ Pending |
| Verify all 30 modules documented | TBD | ⬜ Pending |
| Verify all 50+ database models documented | TBD | ⬜ Pending |
| Verify all API endpoints documented | TBD | ⬜ Pending |
| Create database ERD diagram | TBD | ⬜ Pending |

### Phase 4: Ongoing Maintenance

| Task | Frequency |
|------|-----------|
| Run module documentation validation | Every PR |
| Run CLAUDE.md freshness check | Every PR |
| Update module map | Weekly (automated) |
| Full documentation audit | Quarterly |

---

## Part 6: Success Metrics

### Quantitative Metrics

| Metric | Target | Current |
|--------|--------|---------|
| JSDoc coverage (public functions) | >90% | TBD |
| Modules with documentation | 100% | ~95% |
| API endpoints documented | 100% | ~90% |
| Database models documented | 100% | ~85% |
| CI doc validation passing | 100% | N/A |

### Qualitative Metrics

- Developer onboarding time reduced
- Fewer documentation-related questions in PRs
- AI assistant (Claude) can navigate codebase effectively
- External contributors can understand codebase quickly

---

## Appendix A: File Locations Summary

| Purpose | Location |
|---------|----------|
| PR Template | `.github/PULL_REQUEST_TEMPLATE.md` |
| Doc Validation CI | `.github/workflows/docs-validation.yml` |
| Claude Review (updated) | `.github/workflows/claude-review.yml` |
| Pre-commit hook | `pmo/.husky/pre-commit` |
| Module validation script | `pmo/scripts/validate-module-docs.mjs` |
| CLAUDE.md validation script | `pmo/scripts/validate-claude-md.mjs` |
| Module map generator | `pmo/scripts/generate-module-map.mjs` |

## Appendix B: Related Documentation

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Main AI assistant guide |
| `Docs/MODULES.md` | Module configuration guide |
| `DOCUMENTATION-REVIEW-PLAN.md` | Original review methodology |
| `DOCUMENTATION-AUDIT-MASTER-REPORT.md` | Audit findings |

---

*Plan Version: 1.0*
*Created: December 29, 2025*
*Author: Claude Code Assistant*
