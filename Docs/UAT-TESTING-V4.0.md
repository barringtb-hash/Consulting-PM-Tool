# UAT Testing Script v4.0

## AI CRM Platform - Comprehensive User Acceptance Testing

**Version:** 4.0
**Last Updated:** January 2, 2026
**Purpose:** Comprehensive User Acceptance Testing script with UI/UX evaluation
**Application URL:** https://verdanthorizon.ai

---

## Table of Contents

1. [Pre-Test Setup](#1-pre-test-setup)
2. [Authentication (AUTH)](#2-authentication-auth)
3. [Navigation (NAV)](#3-navigation-nav)
4. [CRM Accounts (CRM-ACC)](#4-crm-accounts-crm-acc)
5. [CRM Opportunities (CRM-OPP)](#5-crm-opportunities-crm-opp)
6. [CRM Contacts (CRM-CON)](#6-crm-contacts-crm-con)
7. [PMO Projects (PMO-PRJ)](#7-pmo-projects-pmo-prj)
8. [PMO Tasks (PMO-TSK)](#8-pmo-tasks-pmo-tsk)
9. [PMO Meetings (PMO-MTG)](#9-pmo-meetings-pmo-mtg)
10. [Leads Management (LEAD)](#10-leads-management-lead)
11. [Bug Tracking (BUG)](#11-bug-tracking-bug)
12. [Finance Module (FIN)](#12-finance-module-fin)
13. [AI Tools - Phase 1 (AI1)](#13-ai-tools---phase-1-ai1)
14. [AI Tools - Phase 2 (AI2)](#14-ai-tools---phase-2-ai2)
15. [AI Tools - Phase 3 (AI3)](#15-ai-tools---phase-3-ai3)
16. [Operations Dashboard (OPS)](#16-operations-dashboard-ops)
17. [Admin Module (ADM)](#17-admin-module-adm)
18. [Infrastructure & Compliance (INF)](#18-infrastructure--compliance-inf)
19. [API Health (API)](#19-api-health-api)
20. [Accessibility Testing (A11Y)](#20-accessibility-testing-a11y)
21. [Responsive Design (RESP)](#21-responsive-design-resp)
22. [Performance Testing (PERF)](#22-performance-testing-perf)
23. [Test Results Summary](#23-test-results-summary)
24. [Issue Log](#24-issue-log)
25. [Sign-Off](#25-sign-off)

---

## 1. Pre-Test Setup

### 1.1 Test Credentials

| Role | Email | Password | Use For |
|------|-------|----------|---------|
| Admin | admin@pmo.test | AdminDemo123! | Admin features, full access testing |
| Consultant | avery.chen@pmo.test | PmoDemo123! | Consultant workflow testing |
| Consultant | priya.desai@pmo.test | PmoDemo123! | Multi-user testing |
| Consultant | marco.silva@pmo.test | PmoDemo123! | Multi-user testing |

### 1.2 Pre-Test Checklist

Before starting UAT testing, verify:
- [ ] Database has been seeded with test data (`npx prisma db seed`)
- [ ] Application is running and accessible
- [ ] Clear browser cache/use incognito mode
- [ ] Note any existing issues before testing
- [ ] API health check (`/api/healthz`) returns 200

### 1.3 Environment Verification

| Check | Status | Notes |
|-------|--------|-------|
| Application URL accessible | [ ] Pass [ ] Fail | |
| API health check returns 200 | [ ] Pass [ ] Fail | |
| Database connectivity verified | [ ] Pass [ ] Fail | |
| All required modules enabled | [ ] Pass [ ] Fail | |

### 1.4 Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | [ ] Pass [ ] Fail |
| Firefox | Latest | [ ] Pass [ ] Fail |
| Safari | Latest | [ ] Pass [ ] Fail |
| Edge | Latest | [ ] Pass [ ] Fail |

---

## 2. Authentication (AUTH)

### AUTH-001: Admin Login
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to application URL | Login page displays |
| 2 | Enter admin@pmo.test / AdminDemo123! | Credentials accepted |
| 3 | Click Login | Redirects to dashboard |
| 4 | Check sidebar navigation | All menu items visible |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AUTH-002: Consultant Login
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log out if logged in | Returns to login page |
| 2 | Enter avery.chen@pmo.test / PmoDemo123! | Credentials accepted |
| 3 | Click Login | Redirects to dashboard |
| 4 | Check sidebar navigation | Appropriate menu items visible |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AUTH-003: Invalid Login
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter invalid email/password | Error message displays |
| 2 | Verify error is user-friendly | "Invalid credentials" or similar |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AUTH-004: Session Persistence
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login successfully | Dashboard loads |
| 2 | Refresh browser | Still logged in |
| 3 | Open new tab, navigate to app | Still logged in |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AUTH-005: Logout
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click logout button/menu | Logs out successfully |
| 2 | Try to access protected route | Redirects to login |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AUTH UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Form layout and alignment | | |
| Input field styling consistency | | |
| Error message visibility and clarity | | |
| Loading state indication on submit | | |
| Password field visibility toggle | | |
| "Forgot password" link accessible | | |
| Mobile responsiveness | | |
| Color contrast (accessibility) | | |
| Focus states visible | | |
| Tab order logical | | |

---

## 3. Navigation (NAV)

### NAV-001: Sidebar Navigation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click Dashboard | Dashboard page loads |
| 2 | Click CRM > Accounts | Accounts list loads |
| 3 | Click CRM > Opportunities | Opportunities/Pipeline view loads |
| 4 | Click CRM > Contacts | Contacts list loads |
| 5 | Click Projects | Projects list loads |
| 6 | Click Tasks | Tasks Kanban board loads |
| 7 | Click Leads | Leads list loads |
| 8 | Click Bug Tracking > Issues | Issues list loads |
| 9 | Click Finance (if enabled) | Finance dashboard loads |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### NAV-002: Invalid Route Handling
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to /invalid-route | 404 page displays |
| 2 | Navigate to /crm/accounts/99999 | Error or 404 page displays |
| 3 | Check for back/home navigation options | Link to return to valid pages |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### NAV-003: Mobile Responsiveness
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Resize browser to mobile width | Layout adapts |
| 2 | Test sidebar collapse/hamburger menu | Navigation accessible |
| 3 | Test main content area | Content readable |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### NAV UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Navigation hierarchy clarity | | |
| Icon consistency and meaning | | |
| Active page highlighting | | |
| Hover states | | |
| Scrolling behavior for long lists | | |
| Mobile hamburger menu usability | | |
| Sub-navigation indentation | | |
| Navigation group labels | | |
| Collapse/expand behavior | | |
| Breadcrumb presence (if applicable) | | |

### Dashboard UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Overall layout and spacing | | |
| Widget card consistency | | |
| Data visualization clarity | | |
| Loading states for async data | | |
| Empty states when no data | | |
| Responsive grid layout | | |
| Quick action visibility | | |
| Recent activity display | | |

---

## 4. CRM Accounts (CRM-ACC)

### CRM-ACC-001: View Accounts List
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to CRM > Accounts | Accounts list displays |
| 2 | Verify seeded accounts appear | Should see: Acme Manufacturing, Brightside Health Group, TechForward Inc, GreenEnergy Solutions, Velocity Logistics |
| 3 | Check columns display | Name, Type, Industry, Owner, Health Score visible |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-ACC-002: View Account Details
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on "Acme Manufacturing" | Account detail page loads |
| 2 | Verify basic info displays | Name, website, phone, industry |
| 3 | Check health score display | Shows score with color indicator |
| 4 | Verify contacts section | Shows Dana Patel, Miguel Rodriguez |
| 5 | Check opportunities section | Shows linked opportunities |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-ACC-003: Create New Account
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Account" button | Account form opens |
| 2 | Fill required fields: Name = "Test Company UAT" | Fields accept input |
| 3 | Select Type = "Prospect" | Dropdown works |
| 4 | Enter Industry = "Technology" | Field accepts input |
| 5 | Click Save | Account created, redirects to list |
| 6 | Verify new account in list | "Test Company UAT" appears |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-ACC-004: Edit Account
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to "Test Company UAT" detail page | Page loads |
| 2 | Click Edit button | Edit form opens |
| 3 | Change Name to "Test Company UAT Updated" | Field updates |
| 4 | Click Save | Changes saved |
| 5 | Verify name changed | New name displays |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-ACC-005: Archive Account
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On account detail page, click Archive | Confirmation dialog appears |
| 2 | Confirm archive | Account archived |
| 3 | Verify account not in main list | Hidden from default view |
| 4 | Check archived filter (if available) | Account shows in archived |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-ACC-006: Restore Archived Account
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Filter to show archived accounts | Archived accounts display |
| 2 | Find archived account | Account visible |
| 3 | Click Restore button | Account restored |
| 4 | Verify account in main list | Account appears in list |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-ACC-007: Account Search/Filter
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On accounts list, search for "Acme" | Filters to matching accounts |
| 2 | Clear search, filter by Type = "Customer" | Shows only customers |
| 3 | Filter by Industry = "Healthcare" | Shows Brightside Health |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-ACC-008: Health Score Recalculation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to account detail (e.g., Acme Manufacturing) | Page loads |
| 2 | Click "Recalculate Health Score" button | Loading indicator shows |
| 3 | Wait for calculation | Score updates based on CRM data |
| 4 | Verify score is not default 50 | Score reflects actual metrics |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-ACC-009: Account CTAs
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On account detail, navigate to CTAs tab | CTA list displays |
| 2 | Click "Add CTA" | CTA form opens |
| 3 | Fill in CTA details | Fields accept input |
| 4 | Save CTA | CTA created and appears |
| 5 | Edit existing CTA | Changes save |
| 6 | Close/Snooze CTA | Status updates |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-ACC-010: Account Success Plans
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On account detail, navigate to Success Plans | Plans list displays |
| 2 | Click "Create Success Plan" | Plan form opens |
| 3 | Add objectives and tasks | All fields work |
| 4 | Activate plan | Plan status changes |
| 5 | Mark task complete | Task status updates |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM Accounts UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| List/grid layout clarity | | |
| Account card design | | |
| Search input placement | | |
| Filter controls usability | | |
| Empty state design | | |
| Loading skeleton display | | |
| Action button visibility | | |
| Status badge styling | | |
| Type indicator icons | | |
| Health score visualization | | |

### Account Detail UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Tab navigation clarity | | |
| Information hierarchy | | |
| Edit mode toggle | | |
| Form validation feedback | | |
| Related data cards | | |
| Action buttons placement | | |
| Health score visualization | | |
| CTA priority indicators | | |
| Success plan progress display | | |
| Activity timeline clarity | | |

---

## 5. CRM Opportunities (CRM-OPP)

### CRM-OPP-001: View Opportunities Pipeline
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to CRM > Opportunities | Pipeline/Kanban view loads |
| 2 | Verify pipeline stages display | Lead, Discovery, Proposal, Negotiation, Closed Won, Closed Lost |
| 3 | Check seeded opportunities appear | Multiple opportunities visible in stages |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-OPP-002: View Opportunity Details
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on an opportunity | Detail page loads |
| 2 | Verify amount displays | Dollar amount shown |
| 3 | Check probability | Percentage shown |
| 4 | Verify linked account | Account name linked |
| 5 | Check stage displayed | Current stage shown |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-OPP-003: Create New Opportunity
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Opportunity" button | Form opens |
| 2 | Fill Name = "UAT Test Opportunity" | Field accepts input |
| 3 | Select Account = "TechForward Inc" | Dropdown works |
| 4 | Enter Amount = 100000 | Number accepted |
| 5 | Select Stage from dropdown | **All pipeline stages appear** |
| 6 | Select Stage = "Discovery" | Stage selected |
| 7 | Click Save | Opportunity created |
| 8 | Verify in pipeline | Shows in correct column |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-OPP-004: Move Opportunity Stage (Drag & Drop)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On pipeline view, find "UAT Test Opportunity" | Opportunity visible |
| 2 | Drag to "Proposal" stage | Card moves |
| 3 | Release | Stage updated |
| 4 | Refresh page | Change persisted |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-OPP-005: Move Opportunity Stage (Detail Page)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on opportunity to view details | Detail page loads |
| 2 | Click stage dropdown | Stage options appear |
| 3 | Select "Negotiation" | Stage updates |
| 4 | Verify probability auto-updates | Probability reflects stage |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-OPP-006: Mark Opportunity Won
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On opportunity detail, click "Mark Won" | Button visible and clickable |
| 2 | Confirm action | Status = WON |
| 3 | Verify stage = "Closed Won" | Pipeline reflects change |
| 4 | Check probability = 100% | Updated |
| 5 | Check actual close date set | Date populated |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-OPP-007: Mark Opportunity Lost
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create or select an open opportunity | Opportunity ready |
| 2 | Click "Mark Lost" | Lost reason dialog appears |
| 3 | Enter reason = "Lost to competitor" | Field accepts input |
| 4 | Confirm | Status = LOST |
| 5 | Verify stage = "Closed Lost" | Pipeline reflects change |
| 6 | Verify lost reason saved | Reason displayed |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-OPP-008: Pipeline Statistics
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View pipeline dashboard/stats | Stats section visible |
| 2 | Check total pipeline value | Sum of all opportunity amounts |
| 3 | Check weighted pipeline | Sum of weighted amounts |
| 4 | Verify stage counts | Number of deals per stage |
| 5 | Check win rate | Percentage displayed |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-OPP-009: Stage History
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View opportunity with stage changes | Detail page loads |
| 2 | Find stage history section | History visible |
| 3 | Verify previous stages recorded | Stages with dates shown |
| 4 | Check duration in each stage | Days calculated |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM Opportunities UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Kanban board layout | | |
| Stage column headers | | |
| Opportunity card design | | |
| Drag-and-drop feedback | | |
| Amount/value display formatting | | |
| Probability indicators | | |
| Stage color coding | | |
| Column overflow handling | | |
| Stats panel clarity | | |
| New opportunity button visibility | | |

### Opportunity Detail UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Header with key metrics | | |
| Stage progress indicator | | |
| Won/Lost action buttons visibility | | |
| Form field organization | | |
| Stage history visualization | | |
| Contact role display | | |
| Value/probability formatting | | |
| Edit mode UX | | |
| Related activities display | | |

---

## 6. CRM Contacts (CRM-CON)

### CRM-CON-001: View Contacts List
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to CRM > Contacts | Contacts list displays |
| 2 | Verify seeded contacts | Dana Patel, Sarah Kim, etc. visible |
| 3 | Check contact details display | Name, email, phone, title, account |
| 4 | Verify stats cards | Lifecycle counts shown |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-CON-002: Filter Contacts
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Filter by lifecycle = "Lead" | Only leads shown |
| 2 | Filter by lifecycle = "Customer" | Only customers shown |
| 3 | Search by name | Matching contacts display |
| 4 | Clear filters | All contacts shown |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-CON-003: Create Contact
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Contact" button | Navigate to new contact form |
| 2 | Enter First Name = "UAT" | Field accepts input |
| 3 | Enter Last Name = "Tester" | Field accepts input |
| 4 | Enter Email = "uat.tester@test.example.com" | Field accepts input |
| 5 | Enter Job Title = "QA Manager" | Field accepts input |
| 6 | Select Account from dropdown | Account selected |
| 7 | Select Lifecycle = "Lead" | Lifecycle selected |
| 8 | Select Lead Source | Source selected |
| 9 | Click Save | Contact created |
| 10 | Verify in contacts list | New contact appears |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-CON-004: Edit Contact
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find "UAT Tester" contact | Contact visible |
| 2 | Click edit or navigate to detail | Edit form opens |
| 3 | Change Job Title to "Senior QA Manager" | Field updates |
| 4 | Change Lifecycle to "MQL" | Field updates |
| 5 | Save | Changes saved |
| 6 | Verify updates | New values display |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-CON-005: Delete/Archive Contact
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find contact to delete | Contact visible |
| 2 | Click delete button | Confirmation appears |
| 3 | Confirm delete | Contact archived |
| 4 | Verify not in main list | Hidden from view |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-CON-006: Contact Validation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try to save contact without first name | Validation error |
| 2 | Try to save contact without last name | Validation error |
| 3 | Enter invalid email format | Validation error |
| 4 | Enter invalid LinkedIn URL | Validation error |
| 5 | Enter invalid Twitter URL | Validation error |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM Contacts UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Contact card layout | | |
| Lifecycle stage badges | | |
| Account association display | | |
| Contact info visibility (email, phone) | | |
| Stats card design | | |
| Empty state message | | |
| Search input placement | | |
| Filter dropdown usability | | |
| Delete confirmation clarity | | |

### Contact Form UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Form section organization | | |
| Required field indicators (*) | | |
| Dropdown styling consistency | | |
| Checkbox alignment | | |
| URL field placeholders | | |
| Cancel/Save button placement | | |
| Validation error display | | |
| Account dropdown searchability | | |
| Lifecycle options clarity | | |
| Lead source options clarity | | |

---

## 7. PMO Projects (PMO-PRJ)

### PMO-PRJ-001: View Projects List
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Projects | Projects list loads |
| 2 | Verify seeded projects | AI Strategy Roadmap, Predictive Maintenance Rollout, AI Intake Modernization |
| 3 | Check project info displays | Name, Account, Status, Health |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### PMO-PRJ-002: View Project Details
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on "AI Strategy Roadmap" | Project detail page loads |
| 2 | Check overview section | Name, status, dates visible |
| 3 | Verify milestones display | Multiple milestones shown |
| 4 | Check tasks display | Tasks visible |
| 5 | Verify meetings display | Meeting notes visible |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### PMO-PRJ-003: Create Project
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Project" | Form/wizard opens |
| 2 | Enter Name = "UAT Test Project" | Field accepts input |
| 3 | Select Account = "Acme Manufacturing" | Dropdown works |
| 4 | Select Status = "Planning" | Dropdown works |
| 5 | Enter Start Date | Date picker works |
| 6 | Click Save | Project created |
| 7 | Verify in list | New project appears |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### PMO-PRJ-004: Edit Project Status
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open "UAT Test Project" | Detail page loads |
| 2 | Click Edit or Status dropdown | Edit mode/dropdown opens |
| 3 | Change Status to "In Progress" | Field updates |
| 4 | Save | Changes saved |
| 5 | Verify status updated | New status displays |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### PMO Projects UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Project card design | | |
| Status indicators | | |
| Progress visualization | | |
| Date formatting | | |
| Action buttons | | |
| Empty state | | |
| Filter/search controls | | |

### Project Detail UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Dashboard layout | | |
| Task board usability | | |
| Milestone timeline | | |
| Team member display | | |
| Progress indicators | | |
| Quick action buttons | | |
| Tab organization | | |

---

## 8. PMO Tasks (PMO-TSK)

### PMO-TSK-001: View Tasks Kanban
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Tasks | Kanban board loads |
| 2 | Verify columns | Backlog, To Do, In Progress, In Review, Done |
| 3 | Check seeded tasks appear | Multiple tasks visible |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### PMO-TSK-002: Create Task
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Task" or "+" button | Task form opens |
| 2 | Enter Title = "UAT Test Task" | Field accepts input |
| 3 | Select Project = "AI Strategy Roadmap" | Dropdown works |
| 4 | Select Priority = "P1" | Dropdown works |
| 5 | Select Status = "Backlog" | Dropdown works |
| 6 | Click Save | Task created |
| 7 | Verify in Backlog column | Task card appears |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### PMO-TSK-003: Move Task (Drag & Drop)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find "UAT Test Task" in Backlog | Task visible |
| 2 | Drag to "In Progress" column | Card moves |
| 3 | Release | Status updated |
| 4 | Refresh page | Change persisted |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### PMO-TSK-004: Edit Task Details
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on task to view details | Detail panel/modal opens |
| 2 | Edit description | Field accepts input |
| 3 | Change assignee | Dropdown works |
| 4 | Set due date | Date picker works |
| 5 | Save | Changes saved |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### PMO-TSK-005: Filter Tasks by Project
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On Kanban board, find project filter | Filter control visible |
| 2 | Select "Predictive Maintenance Rollout" | Tasks filtered |
| 3 | Verify only project tasks show | Correct tasks displayed |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### PMO Tasks UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Kanban column layout | | |
| Task card design | | |
| Priority color coding | | |
| Drag-and-drop feedback | | |
| Due date visibility | | |
| Assignee avatars | | |
| Overdue indicators | | |
| Filter controls | | |
| Add task button placement | | |

---

## 9. PMO Meetings (PMO-MTG)

### PMO-MTG-001: View Meetings
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project with meetings | Project detail loads |
| 2 | Find Meetings section | Meetings listed |
| 3 | Verify seeded meetings | Operations Pulse Check, etc. visible |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### PMO-MTG-002: Create Meeting
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Meeting" on project | Meeting form opens |
| 2 | Enter Title = "UAT Test Meeting" | Field accepts input |
| 3 | Enter Date | Date picker works |
| 4 | Enter Time = "10:00 AM" | Field accepts input |
| 5 | Enter Attendees = ["Tester 1", "Tester 2"] | Field accepts input |
| 6 | Enter Notes = "Test meeting notes" | Field accepts input |
| 7 | Click Save | Meeting created |
| 8 | Verify in meetings list | New meeting appears |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### PMO-MTG-003: Edit Meeting
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click edit on "UAT Test Meeting" | Edit form opens |
| 2 | Add decision = "Decided to proceed" | Field accepts input |
| 3 | Add risk = "Timeline may slip" | Field accepts input |
| 4 | Save | Changes saved |
| 5 | Verify updates | New fields display |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### PMO Meetings UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Meeting list layout | | |
| Date/time display | | |
| Attendee chips | | |
| Action items visibility | | |
| Decisions/risks sections | | |
| Notes formatting | | |

---

## 10. Leads Management (LEAD)

### LEAD-001: View Leads List
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Leads | Leads list displays |
| 2 | Verify seeded leads | David Chen, Amanda Foster, James Wilson, etc. |
| 3 | Check lead info displays | Name, Email, Company, Status, Source |
| 4 | Verify metrics cards | Counts by status displayed |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### LEAD-002: Create Lead
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Lead" button | Lead form opens |
| 2 | Enter Name = "UAT Lead Test" | Field accepts input |
| 3 | Enter Email = "uat.lead@test.example.com" | Field accepts input |
| 4 | Enter Company = "UAT Corp" | Field accepts input |
| 5 | Select Source = "Website Contact" | Dropdown works |
| 6 | Select Service Interest = "Strategy" | Dropdown works |
| 7 | Click Save | Lead created |
| 8 | Verify in leads list | **New lead appears in list** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### LEAD-003: Update Lead Status
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on "UAT Lead Test" | Lead detail opens |
| 2 | Change Status from "New" to "Contacted" | Dropdown works |
| 3 | Save | Status updated |
| 4 | Verify in list | New status displays |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### LEAD-004: Convert Lead
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find a lead with status "Qualified" | E.g., James Wilson |
| 2 | Click "Convert" button | Conversion dialog opens |
| 3 | Configure: Create Opportunity = Yes | Option selected |
| 4 | Enter Opportunity Amount = 75000 | Field accepts input |
| 5 | Click Convert | Lead converted |
| 6 | Verify lead status = "Converted" | Status updated |
| 7 | Check new Account created | Account visible |
| 8 | Check new Opportunity created | Opportunity visible |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### Leads UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Lead card/row layout | | |
| Status badges | | |
| Source indicators | | |
| Company display | | |
| Convert button visibility | | |
| Filter controls | | |
| Metrics cards design | | |
| Empty state | | |

---

## 11. Bug Tracking (BUG)

### BUG-001: View Issues List
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Bug Tracking > Issues | Issues list displays |
| 2 | Verify seeded issues | Dashboard charts issue, bulk export feature request, etc. |
| 3 | Check columns | Title, Type, Status, Priority, Labels |
| 4 | Verify metrics display | Open/closed counts shown |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### BUG-002: View Issue Details
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on "Dashboard charts not loading on slow connections" | Issue detail page loads |
| 2 | Verify title and description display | Content visible |
| 3 | Check labels display | "bug", "ui/ux" labels shown |
| 4 | Verify assigned to | Marco Silva |
| 5 | Check status | Open |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### BUG-003: Create New Issue
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Issue" button | Issue form opens |
| 2 | Enter Title = "UAT Test Issue" | Field accepts input |
| 3 | Enter Description = "This is a test issue for UAT" | Field accepts input |
| 4 | Select Type = "Bug" | Dropdown works |
| 5 | Select Priority = "Medium" | Dropdown works |
| 6 | Select Labels = ["bug", "ui/ux"] | Multi-select works |
| 7 | Click Save | Issue created |
| 8 | Verify in issues list | New issue appears |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### BUG-004: Update Issue Status
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open "UAT Test Issue" detail | Detail page loads |
| 2 | Change Status to "In Progress" | Dropdown/button works |
| 3 | Save | Status updated |
| 4 | Verify status change | New status displays |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### BUG-005: Assign Issue
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to issue edit page | Edit form opens |
| 2 | Find Assignee field | **Field visible in form** |
| 3 | Select "Avery Chen" | User selected |
| 4 | Save | Assignment saved |
| 5 | Verify assignee displays | Avery Chen shown |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### BUG-006: Add Comment to Issue
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On issue detail, find Comments section | Comments area visible |
| 2 | Enter comment = "This is a test comment" | Field accepts input |
| 3 | Click Post/Add | Comment saved |
| 4 | Verify comment appears | Comment displays with timestamp |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### BUG-007: Filter Issues
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On issues list, filter by Status = "Open" | Filters applied |
| 2 | Verify only open issues show | Correct filtering |
| 3 | Filter by Priority = "High" | Filters applied |
| 4 | Filter by Label = "bug" | Filters applied |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### Bug Tracking UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Issue list layout | | |
| Priority indicators | | |
| Status badges | | |
| Type icons | | |
| Label chips | | |
| Assignee display | | |
| Date formatting | | |
| Filter panel usability | | |
| Metrics cards | | |

### Issue Detail UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Header information | | |
| Description formatting | | |
| Error/stack trace display | | |
| Comments section | | |
| Status change workflow | | |
| AI suggestions presentation | | |
| Edit button visibility | | |

---

## 12. Finance Module (FIN)

### FIN-001: View Finance Dashboard
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Finance | Dashboard displays |
| 2 | Verify summary widgets | Total spending, budget status, etc. |
| 3 | Check spending charts | Charts render correctly |
| 4 | View recent expenses | Expense list displays |
| 5 | View upcoming renewals | Renewals list displays |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### FIN-002: Create Expense
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Finance > Expenses | Expenses list loads |
| 2 | Click "New Expense" | Form opens |
| 3 | Enter description | Field accepts input |
| 4 | Enter amount | Number accepted |
| 5 | Select category | Dropdown works |
| 6 | Select vendor | Field works |
| 7 | Save | Expense created |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### FIN-003: Approve/Reject Expense
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find pending expense | Expense with pending status |
| 2 | Click Approve | Status changes to approved |
| 3 | Find another pending expense | Expense visible |
| 4 | Click Reject | Status changes to rejected |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### FIN-004: Create Budget
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Finance > Budgets | Budgets list loads |
| 2 | Click "New Budget" | Form opens |
| 3 | Enter budget name | Field accepts input |
| 4 | Enter amount | Number accepted |
| 5 | Select period | Date range works |
| 6 | Select category | Dropdown works |
| 7 | Save | Budget created |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### FIN-005: View Budget Utilization
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View budget card | Budget displayed |
| 2 | Check utilization progress | Progress bar accurate |
| 3 | Click to view expenses | Related expenses shown |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### FIN-006: Create Recurring Cost
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Finance > Recurring Costs | List loads |
| 2 | Click "New Recurring Cost" | Form opens |
| 3 | Enter details | All fields accept input |
| 4 | Set frequency | Dropdown works |
| 5 | Save | Recurring cost created |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### Finance UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Dashboard layout | | |
| Chart readability | | |
| Currency formatting | | |
| Trend indicators | | |
| Card consistency | | |
| Expense list layout | | |
| Status badges | | |
| Category icons/colors | | |
| Budget progress bar | | |
| Approval workflow clarity | | |

---

## 13. AI Tools - Phase 1 (AI1)

### AI1-001: AI Chatbot Configuration
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Chatbot | Configuration page loads |
| 2 | Update chatbot settings | Settings saved |
| 3 | Customize widget appearance | Changes preview |
| 4 | Manage knowledge base items | CRUD works |
| 5 | View conversation analytics | Analytics display |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AI1-002: Product Descriptions
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Product Descriptions | Page loads |
| 2 | Enter product details | Fields accept input |
| 3 | Select tone/style | Options available |
| 4 | Click Generate | AI generates content |
| 5 | Edit generated content | Edits work |
| 6 | Save description | Content saves |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AI1-003: AI Scheduling
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Scheduling | Dashboard displays |
| 2 | Create appointment type | Type created |
| 3 | Configure booking rules | Rules saved |
| 4 | View AI insights tab | Insights display |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AI1-004: Intelligent Intake
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Intake | Dashboard displays |
| 2 | View/create intake forms | Forms work |
| 3 | View form submissions | Submissions display |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AI Tools Phase 1 UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Tab navigation | | |
| Configuration forms | | |
| Widget preview | | |
| AI generation progress | | |
| Output display | | |
| Analytics charts | | |

---

## 14. AI Tools - Phase 2 (AI2)

### AI2-001: Document Analyzer
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Document Analyzer | Page loads |
| 2 | Upload document | Document uploads |
| 3 | Process document | Analysis runs |
| 4 | View extracted fields | Fields display |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AI2-002: Content Generator
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Content Generator | Page loads |
| 2 | Enter prompt | Field accepts input |
| 3 | Select content type | Options available |
| 4 | Generate content | Content generates |
| 5 | Edit/save content | Edits work |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AI2-003: Lead Scoring
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Lead Scoring | Dashboard loads |
| 2 | View scoring configuration | Rules display |
| 3 | View lead scores | Scores display |
| 4 | View score breakdown | Details available |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AI2-004: Prior Authorization
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Prior Auth | Page loads |
| 2 | Create authorization request | Form works |
| 3 | Upload supporting documents | Uploads work |
| 4 | View AI recommendation | Recommendation displays |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AI Tools Phase 2 UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Upload interface | | |
| Processing progress | | |
| Results display | | |
| Score visualization | | |
| Recommendation clarity | | |

---

## 15. AI Tools - Phase 3 (AI3)

### AI3-001: Inventory Forecasting
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Inventory Forecasting | Dashboard loads |
| 2 | View forecast data | Data displays |
| 3 | Run forecast model | Forecast generates |
| 4 | View forecast results | Results display |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AI3-002: Compliance Monitor
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Compliance Monitor | Dashboard loads |
| 2 | View compliance status | Status displays |
| 3 | Run compliance scan | Scan executes |
| 4 | View violations | Violations list |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AI3-003: Predictive Maintenance
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Predictive Maintenance | Dashboard loads |
| 2 | View equipment status | Status displays |
| 3 | View predictions | Predictions display |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AI3-004: Revenue Management
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Revenue Management | Dashboard loads |
| 2 | View pricing recommendations | Recommendations display |
| 3 | View revenue forecasts | Forecasts display |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AI3-005: Safety Monitor
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Safety Monitor | Dashboard loads |
| 2 | View safety alerts | Alerts display |
| 3 | Acknowledge alert | Status updates |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AI Tools Phase 3 UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Dashboard layouts | | |
| Forecast charts | | |
| Alert severity indicators | | |
| Prediction confidence | | |
| Action buttons | | |

---

## 16. Operations Dashboard (OPS)

### OPS-001: Main Operations Dashboard
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Operations | Dashboard displays |
| 2 | View system health | Health indicators show |
| 3 | View active alerts | Alerts display |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### OPS-002: AI Usage Page
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Operations > AI Usage | Metrics display |
| 2 | View cost breakdown | Costs display |
| 3 | Filter by date range | Data filters |
| 4 | View usage by tool | Breakdown displays |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### OPS-003: Infrastructure Monitoring
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Operations > Infrastructure | Status displays |
| 2 | View service health | Health shows |
| 3 | View resource utilization | Metrics display |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### OPS-004: Alerts Management
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Operations > Alerts | Alerts list displays |
| 2 | View alert details | Details show |
| 3 | Acknowledge alert | Status updates |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### Operations UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Dashboard layout | | |
| Health indicators | | |
| Alert visibility | | |
| Chart readability | | |
| Cost visualization | | |
| Date range picker | | |

---

## 17. Admin Module (ADM)

### ADM-001: View Users List
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Admin > Users | Users list displays |
| 2 | Search users | Search works |
| 3 | Filter by role | Filter works |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### ADM-002: Create User
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New User" | Form opens |
| 2 | Enter user details | Fields accept input |
| 3 | Select role | Dropdown works |
| 4 | Save | User created |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### ADM-003: Edit User
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click edit on user | Edit form opens |
| 2 | Update details | Changes save |
| 3 | Change role | Role updates |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### ADM-004: Manage Modules
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Admin > Modules | Modules list displays |
| 2 | Toggle module on/off | Module enables/disables |
| 3 | Save configuration | Config saves |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### ADM-005: Tenant Management (if applicable)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Admin > Tenants | Tenants list displays |
| 2 | View tenant details | Details show |
| 3 | Edit tenant | Changes save |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### Admin UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| User list layout | | |
| Role badges | | |
| Form validation | | |
| Module toggle switches | | |
| Confirmation dialogs | | |

---

## 18. Infrastructure & Compliance (INF)

### INF-001: Core Infrastructure
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Infrastructure > Core | Status displays |
| 2 | View service health | Health shows |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### INF-002: Healthcare Compliance
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Compliance > Healthcare | HIPAA status displays |
| 2 | Run compliance check | Check executes |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### INF-003: Financial Compliance
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Compliance > Financial | SOX/PCI status displays |
| 2 | Run compliance check | Check executes |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### Infrastructure UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Status indicators | | |
| Compliance badges | | |
| Check progress | | |
| Report display | | |

---

## 19. API Health (API)

### API-001: Health Check Endpoint
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Access /api/healthz directly | **Returns 200 OK** |
| 2 | Response contains status | {"status": "ok"} or similar |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### API-002: Authenticated API Access
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | After login, check network requests | API calls succeed with 200 |
| 2 | Verify /api/auth/me returns user | User data returned |
| 3 | Check /api/crm/accounts returns data | Accounts data returned |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### API-003: Unauthenticated Access Blocked
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open new incognito window | Fresh session |
| 2 | Try to access /api/crm/accounts directly | Returns 401 Unauthorized |
| 3 | Try to access /api/projects | Returns 401 Unauthorized |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 20. Accessibility Testing (A11Y)

### A11Y-001: Keyboard Navigation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tab through all interactive elements | Focus visible on all |
| 2 | Use Enter/Space on buttons | Buttons activate |
| 3 | Navigate modals with keyboard | Modal focus trapped |
| 4 | Escape closes modals | Modals close |
| 5 | Navigate dropdowns with arrows | Dropdowns navigate |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### A11Y-002: Screen Reader Compatibility
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify all images have alt text | Alt text present |
| 2 | Form labels associated with inputs | Labels connected |
| 3 | Error messages announced | Errors announced |
| 4 | Page landmarks present | Landmarks exist |
| 5 | Headings in logical order | Hierarchy correct |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### A11Y-003: Color and Contrast
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify text has 4.5:1 contrast ratio | Contrast sufficient |
| 2 | Status not conveyed by color alone | Icons/text also present |
| 3 | Focus indicators visible | Focus clear |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### Accessibility UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Keyboard navigability | | |
| Focus visibility | | |
| Color contrast | | |
| Screen reader support | | |
| ARIA labels | | |
| Skip links | | |
| Error announcements | | |

---

## 21. Responsive Design (RESP)

### RESP-001: Mobile Layout (375px)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Resize browser to 375px width | Layout adapts |
| 2 | Verify sidebar becomes hamburger menu | Menu accessible |
| 3 | Verify content stacks properly | No horizontal overflow |
| 4 | Test touch targets | Buttons 44px+ |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### RESP-002: Tablet Layout (768px)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Resize browser to 768px width | Layout adapts |
| 2 | Verify navigation | Navigation usable |
| 3 | Verify content layout | Content readable |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### RESP-003: Desktop Layout (1024px+)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View at 1024px width | Full layout displays |
| 2 | View at 1440px width | Layout scales well |
| 3 | Verify all features accessible | All functions work |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### RESP-004: Table Responsiveness
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View data tables on mobile | Tables scroll horizontally |
| 2 | Verify column headers visible | Headers stay visible |
| 3 | Check action buttons | Buttons accessible |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### Responsive Design UI/UX Review

| Criteria | Rating (1-5) | Notes |
|----------|--------------|-------|
| Mobile navigation | | |
| Content reflow | | |
| Touch targets | | |
| Table handling | | |
| Form usability on mobile | | |
| Modal sizing | | |

---

## 22. Performance Testing (PERF)

### Page Load Times

| Page | Target (s) | Actual (s) | Status |
|------|------------|------------|--------|
| Login | < 2.0 | | [ ] Pass [ ] Fail |
| Dashboard | < 2.0 | | [ ] Pass [ ] Fail |
| Accounts List | < 2.0 | | [ ] Pass [ ] Fail |
| Opportunities | < 2.0 | | [ ] Pass [ ] Fail |
| Contacts | < 2.0 | | [ ] Pass [ ] Fail |
| Projects | < 2.0 | | [ ] Pass [ ] Fail |
| Finance Dashboard | < 2.0 | | [ ] Pass [ ] Fail |
| AI Tools pages | < 3.0 | | [ ] Pass [ ] Fail |
| Operations Dashboard | < 2.0 | | [ ] Pass [ ] Fail |

### API Response Times

| Endpoint | Target (ms) | Actual (ms) | Status |
|----------|-------------|-------------|--------|
| GET /api/healthz | < 100 | | [ ] Pass [ ] Fail |
| GET /api/crm/accounts | < 500 | | [ ] Pass [ ] Fail |
| GET /api/crm/opportunities | < 500 | | [ ] Pass [ ] Fail |
| GET /api/crm/contacts | < 500 | | [ ] Pass [ ] Fail |
| POST /api/crm/accounts | < 300 | | [ ] Pass [ ] Fail |

### Large Data Sets

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| PERF-001 | Load 100+ accounts | Page renders < 3s | [ ] Pass [ ] Fail |
| PERF-002 | Load 100+ opportunities | Kanban renders | [ ] Pass [ ] Fail |
| PERF-003 | Load 500+ contacts | Pagination works | [ ] Pass [ ] Fail |
| PERF-004 | Search large dataset | Results < 1s | [ ] Pass [ ] Fail |

---

## 23. Test Results Summary

### Summary by Category

| Category | Total Tests | Passed | Failed | Blocked | Notes |
|----------|-------------|--------|--------|---------|-------|
| AUTH | 5 | | | | |
| NAV | 3 | | | | |
| CRM-ACC | 10 | | | | |
| CRM-OPP | 9 | | | | |
| CRM-CON | 6 | | | | |
| PMO-PRJ | 4 | | | | |
| PMO-TSK | 5 | | | | |
| PMO-MTG | 3 | | | | |
| LEAD | 4 | | | | |
| BUG | 7 | | | | |
| FIN | 6 | | | | |
| AI1 | 4 | | | | |
| AI2 | 4 | | | | |
| AI3 | 5 | | | | |
| OPS | 4 | | | | |
| ADM | 5 | | | | |
| INF | 3 | | | | |
| API | 3 | | | | |
| A11Y | 3 | | | | |
| RESP | 4 | | | | |
| PERF | 4+ | | | | |
| **TOTAL** | **~100** | | | | |

### UI/UX Review Summary

| Module | Avg Rating | Critical Issues | Notes |
|--------|------------|-----------------|-------|
| Authentication | /5 | | |
| Navigation | /5 | | |
| CRM Accounts | /5 | | |
| CRM Opportunities | /5 | | |
| CRM Contacts | /5 | | |
| Projects | /5 | | |
| Tasks | /5 | | |
| Leads | /5 | | |
| Bug Tracking | /5 | | |
| Finance | /5 | | |
| AI Tools | /5 | | |
| Operations | /5 | | |
| Admin | /5 | | |

---

## 24. Issue Log

### Critical Issues (Blocking)

| Issue # | Test ID | Description | Severity | Steps to Reproduce |
|---------|---------|-------------|----------|-------------------|
| | | | Critical | |
| | | | Critical | |

### High Priority Issues

| Issue # | Test ID | Description | Severity | Steps to Reproduce |
|---------|---------|-------------|----------|-------------------|
| | | | High | |
| | | | High | |

### Medium Priority Issues

| Issue # | Test ID | Description | Severity | Steps to Reproduce |
|---------|---------|-------------|----------|-------------------|
| | | | Medium | |
| | | | Medium | |

### Low Priority / UI Polish Issues

| Issue # | Test ID | Description | Severity | Notes |
|---------|---------|-------------|----------|-------|
| | | | Low | |
| | | | Low | |

### Enhancement Suggestions

| # | Description | Page/Module | Priority |
|---|-------------|-------------|----------|
| | | | |
| | | | |

---

## 25. Sign-Off

### Tester Information

| Field | Value |
|-------|-------|
| Tester Name | |
| Test Date | |
| Environment URL | |
| Browser/Device | |
| Build Version | |

### Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | | | |
| Dev Lead | | | |
| Product Owner | | | |
| Project Manager | | | |

---

## Appendix A: Notes for AI Agent Tester

When executing this UAT script:

1. **Execute tests in order** - Some tests depend on data created in previous tests
2. **Document all failures immediately** - Include console errors, network failures, and screenshots
3. **Test with different users** - Login as admin first, then consultant for role-based testing
4. **Check for console errors** - Open browser DevTools and monitor for JavaScript errors
5. **Verify data persistence** - After creating items, refresh page to confirm they persist
6. **Rate UI/UX honestly** - Use 1-5 scale: 1=Poor, 2=Below Average, 3=Average, 4=Good, 5=Excellent
7. **Test edge cases**:
   - Empty form submissions
   - Very long text inputs
   - Special characters in text fields
   - Multiple rapid clicks on buttons
8. **Report any UI/UX issues** - Broken layouts, unclear error messages, slow loading
9. **Capture API errors** - Note any 4xx or 5xx responses in network tab

After completing all tests, provide:
- Total pass/fail count
- UI/UX average ratings by module
- List of all failures with reproduction steps
- Any critical issues that block further testing
- Recommendations for improvements

---

## Appendix B: Test Environment Details

| Component | Version/Details |
|-----------|-----------------|
| Application Version | |
| API Version | |
| Database Version | PostgreSQL |
| Node.js Version | |
| React Version | 18.x |
| Browser Versions | |
| Screen Resolution | |
| OS | |

---

## Appendix C: Test Data Created

| Data Type | Name | Status | Created By |
|-----------|------|--------|------------|
| Account | Test Company UAT | | |
| Opportunity | UAT Test Opportunity | | |
| Contact | UAT Tester | | |
| Project | UAT Test Project | | |
| Task | UAT Test Task | | |
| Lead | UAT Lead Test | | |
| Issue | UAT Test Issue | | |
| Expense | | | |
| Budget | | | |

---

*Document Version: 4.0*
*Last Updated: January 2, 2026*
*Based on: UAT Testing Script v3.0 with added UI/UX evaluation criteria*
