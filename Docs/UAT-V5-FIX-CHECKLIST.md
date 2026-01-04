# UAT v5.0 Fix Checklist

**Created:** January 4, 2026
**Based on:** UAT-V5-RESULTS-2026-01-04.md
**Status:** In Progress

---

## How to Use This Checklist

- [ ] Mark tasks complete as you fix them
- [ ] Update status notes with PR numbers or commit hashes
- [ ] Re-run UAT test cases after fixes to verify
- [ ] Move blockers to the top if dependencies are discovered

---

## Sprint 1: Critical Blockers (Week 1)

### 1.1 Fix Persistence Layer - Write Succeeds / Read Fails Pattern

**Affects:** Leads, Assets, Recurring Costs, Expenses

#### Investigation Tasks
- [ ] Add logging to trace data flow on create operations
- [ ] Verify tenant context is propagated on both write and read
- [ ] Check if database transactions are being committed
- [ ] Verify Prisma middleware isn't filtering out newly created records
- [ ] Check if there's a caching layer returning stale data

#### Leads Module Fix
- [ ] Debug `POST /api/leads` - verify record is written to database
- [ ] Debug `GET /api/leads` - verify query includes correct tenant filter
- [ ] Check `pmo/apps/api/src/services/lead.service.ts` for tenant handling
- [ ] Check `pmo/apps/api/src/routes/lead.routes.ts` for middleware order
- [ ] Verify lead count query matches list query filters
- [ ] Test: Create lead → Refresh → Lead appears in list
- [ ] Test: Lead metrics update after creation

#### Assets Module Fix
- [ ] Debug `POST /api/assets` - verify record is written
- [ ] Debug `GET /api/assets` - check why "Unable to load"
- [ ] Check `pmo/apps/api/src/services/asset.service.ts`
- [ ] Check frontend error handling in Assets component
- [ ] Test: Create asset → Asset appears in library

#### Recurring Costs Fix
- [ ] Debug `POST /api/finance/recurring-costs`
- [ ] Debug `GET /api/finance/recurring-costs`
- [ ] Check `pmo/apps/api/src/modules/finance-tracking/services/`
- [ ] Test: Create recurring cost → Appears in list

---

### 1.2 Fix Task Creation API Error

**Affects:** PMO > Tasks

- [ ] Check server logs for stack trace on task creation
- [ ] Review `pmo/apps/api/src/services/task.service.ts` create method
- [ ] Review `pmo/apps/api/src/routes/task.routes.ts` POST handler
- [ ] Validate request payload against Zod schema
- [ ] Check required fields (projectId, title, etc.)
- [ ] Check foreign key constraints (assignee, project exist)
- [ ] Fix the 500 error root cause
- [ ] Test: Create task → Task appears in Kanban board
- [ ] Test: No console errors on task creation

---

### 1.3 Fix Admin Token/Auth Issues

**Affects:** Admin > Users, Admin > Tenants

#### Admin Users Fix
- [ ] Debug `GET /api/admin/users` - "Invalid document ID" error
- [ ] Check `pmo/apps/api/src/routes/admin.routes.ts`
- [ ] Review `requireAdmin` middleware in `pmo/apps/api/src/auth/role.middleware.ts`
- [ ] Verify JWT token is being sent with admin requests
- [ ] Check if user ID parsing is failing
- [ ] Debug `POST /api/admin/users` - "Invalid token" error
- [ ] Verify CSRF token handling for admin routes
- [ ] Test: View users list → Users display
- [ ] Test: Create user → User appears in list

#### Tenants Fix
- [ ] Debug `GET /api/admin/tenants` - infinite loading
- [ ] Debug `POST /api/admin/tenants` - "Invalid token" error
- [ ] Check tenant routes authentication middleware
- [ ] Verify super admin permissions check
- [ ] Test: View tenants → Tenants load
- [ ] Test: Create tenant → Tenant created successfully

---

### 1.4 Fix Expense Creation

**Affects:** Finance > Expenses

- [ ] Check `pmo/apps/web/src/pages/finance/ExpensesPage.tsx` - button click handler
- [ ] Verify onClick is wired to form submission or navigation
- [ ] Check if form submission calls API
- [ ] Review `pmo/apps/api/src/modules/finance-tracking/finance.router.ts`
- [ ] Test: Click "Create Expense" → Form opens or expense created
- [ ] Test: Submit expense → Expense appears in list

---

## Sprint 2: High Priority Issues (Week 2)

### 2.1 Fix Opportunity Stage Changes

**Affects:** CRM > Opportunities

#### Drag and Drop Fix
- [ ] Check `pmo/apps/web/src/pages/crm/OpportunitiesPage.tsx` drag handlers
- [ ] Verify @dnd-kit is properly configured
- [ ] Check if `onDragEnd` calls API to update stage
- [ ] Review `pmo/apps/api/src/crm/services/opportunity.service.ts` stage update
- [ ] Verify `PATCH /api/crm/opportunities/:id/stage` endpoint works
- [ ] Test: Drag opportunity card → Card moves to new column
- [ ] Test: Refresh → Card stays in new column
- [ ] Test: Stage counts update after drag

#### Detail Page Stage Control Fix
- [ ] Add stage dropdown/selector to opportunity detail page
- [ ] Check `pmo/apps/web/src/pages/crm/OpportunityDetailPage.tsx`
- [ ] Wire stage selector to API call
- [ ] Test: Change stage on detail page → Stage updates
- [ ] Test: Probability auto-updates based on stage

#### Mark Won/Lost Fix
- [ ] Review "Mark Won" button handler
- [ ] Review "Mark Lost" button and reason dialog
- [ ] Verify `POST /api/crm/opportunities/:id/won` works
- [ ] Verify `POST /api/crm/opportunities/:id/lost` saves reason
- [ ] Test: Mark Won → Status = WON, stage = Closed Won
- [ ] Test: Mark Lost → Status = LOST, reason saved

---

### 2.2 Fix Contact Edit Validation

**Affects:** CRM > Contacts

- [ ] Review Zod schema in `pmo/apps/api/src/validation/crm/contact.schema.ts`
- [ ] Check which field triggers "Invalid contact data" error
- [ ] Compare create vs update schema requirements
- [ ] Check if optional fields are incorrectly marked required on update
- [ ] Review `pmo/apps/api/src/crm/services/contact.service.ts` update method
- [ ] Test: Edit contact job title → Changes save
- [ ] Test: Edit contact lifecycle → Changes save

---

### 2.3 Fix Task Drag Status Persistence

**Affects:** PMO > Tasks

- [ ] Check task Kanban drag handler calls API
- [ ] Review `PATCH /api/tasks/:id` for status update
- [ ] Verify status enum matches frontend columns
- [ ] Test: Drag task to new column → Status persists after refresh

---

### 2.4 Fix Account Restore

**Affects:** CRM > Accounts

- [ ] Add "Show Archived" filter to accounts list
- [ ] Implement filter UI toggle
- [ ] Test: Archive account → Filter to archived → Account visible
- [ ] Test: Restore account → Account in main list

---

## Sprint 3: Dark Mode & Visual Consistency (Week 3)

### 3.1 Implement Dark Mode Toggle

**Affects:** Global Theme System

#### Theme Context Setup
- [ ] Create/fix theme context in `pmo/apps/web/src/`
- [ ] Store theme preference in localStorage
- [ ] Apply theme class to document root (`dark` class on `<html>`)
- [ ] Ensure toggle button updates context state

#### CSS Variables for Dark Mode
- [ ] Define dark mode CSS variables in Tailwind config or global CSS
- [ ] Variables needed:
  - [ ] `--bg-primary` (page background)
  - [ ] `--bg-secondary` (card background)
  - [ ] `--bg-tertiary` (input background)
  - [ ] `--text-primary`
  - [ ] `--text-secondary`
  - [ ] `--border-color`
  - [ ] `--shadow-color`

#### Test Dark Mode Toggle
- [ ] Test: Click toggle → Theme switches immediately
- [ ] Test: Refresh page → Theme persists
- [ ] Test: New tab → Theme matches preference

---

### 3.2 Apply Dark Mode to All Pages

#### Core Pages
- [ ] Login page - backgrounds, inputs, buttons
- [ ] Dashboard - cards, charts, metrics
- [ ] 404 page - background, text

#### CRM Pages
- [ ] Accounts list - table rows, headers, badges
- [ ] Account detail - tabs, cards, forms
- [ ] Opportunities pipeline - kanban columns, cards
- [ ] Opportunity detail - stage progress, buttons
- [ ] Contacts list - cards, badges, filters
- [ ] Contact form - all form inputs

#### PMO Pages
- [ ] Projects list - cards, status badges
- [ ] Project detail - tabs, milestones, tasks
- [ ] Tasks Kanban - columns, cards, priority colors
- [ ] Meetings - cards, attendee chips

#### Finance Pages
- [ ] Finance dashboard - charts, metrics cards
- [ ] Expenses list - table, status badges
- [ ] Budgets - progress bars, cards
- [ ] Recurring costs - table, frequency badges

#### AI Tools Pages
- [ ] All 13 AI tool pages - configuration forms, outputs

#### Admin Pages
- [ ] Users list - table, role badges
- [ ] Modules - toggle switches
- [ ] Tenants - table

---

### 3.3 Fix Visual Consistency Issues

#### Button Sizing Standardization
- [ ] Audit all buttons across app
- [ ] Primary buttons: 40-44px height
- [ ] Secondary buttons: 36-40px height
- [ ] Small buttons: 28-32px height
- [ ] Icon buttons: 36-40px square
- [ ] Ensure consistent padding (8-12px horizontal)

#### Card Styling Standardization
- [ ] Consistent border-radius (8-12px)
- [ ] Consistent shadow styles
- [ ] Consistent padding (16-24px)
- [ ] Consistent background colors per theme

#### Prevent Page Stretching
- [ ] Add max-width container to main content area
- [ ] Test at 1280px, 1440px, 1920px, 2560px widths
- [ ] Cards should not stretch beyond reasonable width
- [ ] Tables should scroll horizontally if needed

#### Typography Consistency
- [ ] Page titles: 24-32px, bold
- [ ] Section headers: 18-20px, semibold
- [ ] Body text: 14-16px, regular
- [ ] Small text/labels: 12-14px

---

## Sprint 4: Medium Priority & Polish (Week 4)

### 4.1 Fix AI Tools Configuration Dropdowns

**Affects:** 12 AI Tools (all except Product Descriptions)

- [ ] Investigate why config dropdown is empty
- [ ] Check if default configurations should be seeded
- [ ] Check if "New Configuration" should create inline config
- [ ] Fix: AI Chatbot configuration
- [ ] Fix: AI Scheduling configuration
- [ ] Fix: Client Intake configuration
- [ ] Fix: Document Analyzer configuration
- [ ] Fix: Content Generator configuration
- [ ] Fix: Lead Scoring configuration
- [ ] Fix: Prior Authorization configuration
- [ ] Fix: Inventory Forecasting configuration
- [ ] Fix: Compliance Monitor configuration
- [ ] Fix: Predictive Maintenance configuration
- [ ] Fix: Safety Monitor configuration
- [ ] Fix: Revenue Management configuration (client dropdown empty)

---

### 4.2 Fix or Hide Placeholder Modules

#### Infrastructure Module
- [ ] Wire "Configure" buttons to actual functionality OR
- [ ] Disable/hide non-functional buttons
- [ ] Add "Coming Soon" indicators if not implemented

#### Compliance Module
- [ ] Wire action buttons (New BAA, Schedule Assessment, etc.) OR
- [ ] Convert to informational/read-only display
- [ ] General Compliance already shows "Coming soon" - consistent approach

#### Marketing Module
- [ ] Add "Create Content" functionality OR
- [ ] Link to Marketing Demo for content generation
- [ ] Display generated content from demo

---

### 4.3 Improve Error Handling & User Feedback

- [ ] Add error boundaries to catch React errors
- [ ] Show meaningful error messages instead of generic "Error"
- [ ] Prevent success toasts when operations fail
- [ ] Add loading states to all async operations
- [ ] Add retry buttons for failed API calls

---

### 4.4 Fix Navigation Edge Cases

- [ ] Handle deep route errors gracefully
- [ ] Consistent 404 page for invalid routes
- [ ] Improve sidebar scroll behavior

---

## Verification Checklist

After all fixes, re-run these UAT tests:

### Critical Tests (Must Pass)
- [ ] LEAD-001: View Leads List
- [ ] LEAD-002: Create Lead
- [ ] PMO-TSK-002: Create Task
- [ ] ADM-001: View Users List
- [ ] ADM-002: Create User
- [ ] ADM-005: Tenants
- [ ] DM-001: Dark Mode Toggle
- [ ] CRM-OPP-004: Drag & Drop Stage
- [ ] FIN-002: Create Expense

### High Priority Tests
- [ ] CRM-OPP-005: Stage Change (Detail)
- [ ] CRM-OPP-006: Mark Won
- [ ] CRM-OPP-007: Mark Lost
- [ ] CRM-CON-004: Edit Contact
- [ ] PMO-TSK-003: Drag Task
- [ ] FIN-006: Recurring Costs

### Dark Mode Tests
- [ ] All pages render correctly in dark mode
- [ ] Toggle persists preference
- [ ] Contrast ratios meet accessibility standards
- [ ] Charts/graphs readable in dark mode

### Visual Consistency Tests
- [ ] No page stretching on wide screens
- [ ] Button sizes consistent
- [ ] Card styling uniform
- [ ] Typography hierarchy correct

---

## Progress Tracking

| Sprint | Planned | Completed | Remaining | Status |
|--------|---------|-----------|-----------|--------|
| Sprint 1 | 20 | 0 | 20 | Not Started |
| Sprint 2 | 15 | 0 | 15 | Not Started |
| Sprint 3 | 30 | 0 | 30 | Not Started |
| Sprint 4 | 20 | 0 | 20 | Not Started |
| **Total** | **85** | **0** | **85** | **0%** |

---

## Notes & Discoveries

*Add notes here as you work through fixes:*

```
Date:
Issue:
Finding:
Resolution:
```

---

*Last Updated: January 4, 2026*
