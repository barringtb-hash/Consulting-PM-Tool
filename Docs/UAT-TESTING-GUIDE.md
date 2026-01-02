# User Acceptance Testing (UAT) Guide

## AI CRM Platform - Comprehensive UAT Documentation

**Version:** 1.0
**Last Updated:** 2026-01-02
**Purpose:** This document provides detailed test cases for an AI agent to systematically validate all features of the AI CRM Platform.

---

## Table of Contents

1. [Testing Prerequisites](#1-testing-prerequisites)
2. [Error Reporting Guidelines](#2-error-reporting-guidelines)
3. [Authentication Module](#3-authentication-module)
4. [Dashboard & Navigation](#4-dashboard--navigation)
5. [CRM Module - Accounts](#5-crm-module---accounts)
6. [CRM Module - Opportunities](#6-crm-module---opportunities)
7. [CRM Module - Activities](#7-crm-module---activities)
8. [CRM Module - Leads](#8-crm-module---leads)
9. [Projects Module](#9-projects-module)
10. [Tasks & Milestones](#10-tasks--milestones)
11. [Meetings Module](#11-meetings-module)
12. [Finance Tracking Module](#12-finance-tracking-module)
13. [Bug Tracking Module](#13-bug-tracking-module)
14. [Admin Module - Users](#14-admin-module---users)
15. [Admin Module - Modules & Tenants](#15-admin-module---modules--tenants)
16. [AI Tools - Phase 1](#16-ai-tools---phase-1)
17. [AI Tools - Phase 2](#17-ai-tools---phase-2)
18. [AI Tools - Phase 3](#18-ai-tools---phase-3)
19. [Operations Dashboard](#19-operations-dashboard)
20. [Marketing Module](#20-marketing-module)
21. [Assets Module](#21-assets-module)
22. [Cross-Cutting Concerns](#22-cross-cutting-concerns)

---

## 1. Testing Prerequisites

### 1.1 Environment Setup

| Requirement | Details |
|-------------|---------|
| **Frontend URL** | `http://localhost:5173` |
| **API URL** | `http://localhost:3001` |
| **Database** | PostgreSQL with seeded test data |
| **Browser** | Chrome/Chromium (latest version) |

### 1.2 Test Credentials

| Role | Email | Password | Use Case |
|------|-------|----------|----------|
| **Admin** | `admin@pmo.test` | `AdminDemo123!` | Full access testing |
| **Consultant** | `avery.chen@pmo.test` | `PmoDemo123!` | Standard user testing |
| **Consultant** | `priya.desai@pmo.test` | `PmoDemo123!` | Multi-user testing |
| **Consultant** | `marco.silva@pmo.test` | `PmoDemo123!` | Role-based access testing |

### 1.3 Pre-Test Checklist

Before starting UAT, verify:

- [ ] Frontend server running at `http://localhost:5173`
- [ ] API server running at `http://localhost:3001`
- [ ] Database is seeded with test data (`npx prisma db seed`)
- [ ] All modules enabled in `PMO_MODULES` environment variable
- [ ] Browser console is accessible for error monitoring

### 1.4 Module Availability

Ensure these modules are enabled in `PMO_MODULES`:
```
assets,marketing,leads,admin,mcp,chatbot,documentAnalyzer,productDescriptions,scheduling,intake,contentGenerator,leadScoring,priorAuth,inventoryForecasting,complianceMonitor,predictiveMaintenance,revenueManagement,safetyMonitor,financeTracking,bugTracking,customerSuccess
```

---

## 2. Error Reporting Guidelines

### 2.1 Error Documentation Format

When an error is encountered, document it using this format:

```markdown
### ERROR REPORT

**Test Case ID:** [e.g., AUTH-001]
**Module:** [e.g., Authentication]
**Severity:** [Critical/High/Medium/Low]
**Date/Time:** [Timestamp]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:**
[What should have happened]

**Actual Result:**
[What actually happened]

**Error Message:**
[Exact error text from UI or console]

**Console Errors:**
[Any JavaScript console errors]

**Network Errors:**
[Any failed API calls with status codes]

**Screenshot Description:**
[Describe what the screenshot shows - visual state of UI]

**Environment:**
- Browser: [Chrome/Firefox/Safari version]
- Screen Size: [Desktop/Tablet/Mobile dimensions]
- User Role: [Admin/Consultant]
```

### 2.2 Severity Levels

| Level | Definition | Example |
|-------|------------|---------|
| **Critical** | Application crash, data loss, security issue | Login completely broken |
| **High** | Major feature broken, no workaround | Cannot create accounts |
| **Medium** | Feature partially broken, workaround exists | Filter doesn't work but search does |
| **Low** | Minor UI issue, cosmetic problem | Button misaligned |

### 2.3 Screenshot Guidelines

When capturing screenshots, include:
- Full page context when possible
- Browser console open if errors present
- Network tab showing failed requests
- Highlight or annotate the problematic area

---

## 3. Authentication Module

### Test Case: AUTH-001 - Login Page Load
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:5173` | Login page displays |
| 2 | Verify page elements | Email field, Password field, "Sign In" button visible |
| 3 | Verify branding | Logo and application name displayed |
| 4 | Check "Forgot Password" link | Link is visible and clickable |

**Pass Criteria:** All elements render correctly without console errors

---

### Test Case: AUTH-002 - Successful Admin Login
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to login page | Login form visible |
| 2 | Enter email: `admin@pmo.test` | Email field populated |
| 3 | Enter password: `AdminDemo123!` | Password field populated (masked) |
| 4 | Click "Sign In" button | Loading state shown |
| 5 | Wait for redirect | Dashboard page loads at `/dashboard` |
| 6 | Verify user menu | User name displayed in header/sidebar |
| 7 | Check sidebar | Admin menu items visible (Users, Modules, Tenants) |

**Pass Criteria:** User logged in, redirected to dashboard, admin features accessible

---

### Test Case: AUTH-003 - Successful Consultant Login
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to login page | Login form visible |
| 2 | Enter email: `avery.chen@pmo.test` | Email field populated |
| 3 | Enter password: `PmoDemo123!` | Password field populated |
| 4 | Click "Sign In" button | Loading state shown |
| 5 | Wait for redirect | Dashboard page loads |
| 6 | Check sidebar | Admin menu items NOT visible (Users, Modules, Tenants hidden) |

**Pass Criteria:** User logged in, admin features hidden for consultant role

---

### Test Case: AUTH-004 - Invalid Login Credentials
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to login page | Login form visible |
| 2 | Enter email: `wrong@email.com` | Email field populated |
| 3 | Enter password: `WrongPassword123!` | Password field populated |
| 4 | Click "Sign In" button | Loading state shown briefly |
| 5 | Verify error message | Error displayed: "Invalid email or password" or similar |
| 6 | Verify URL | Still on login page, not redirected |

**Pass Criteria:** Clear error message shown, user remains on login page

---

### Test Case: AUTH-005 - Empty Form Submission
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to login page | Login form visible |
| 2 | Click "Sign In" without entering data | Validation triggers |
| 3 | Verify validation messages | "Email is required" and "Password is required" shown |

**Pass Criteria:** Form validation prevents empty submission

---

### Test Case: AUTH-006 - Logout Functionality
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as any user | Dashboard loads |
| 2 | Locate user menu/profile | User dropdown or menu visible |
| 3 | Click "Logout" or "Sign Out" | Logout action triggered |
| 4 | Verify redirect | Redirected to login page |
| 5 | Try navigating to `/dashboard` directly | Redirected back to login |
| 6 | Check browser cookies/storage | Auth token cleared |

**Pass Criteria:** Session terminated, protected routes inaccessible

---

### Test Case: AUTH-007 - Session Persistence
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as any user | Dashboard loads |
| 2 | Refresh the browser (F5) | Page reloads |
| 3 | Verify login state | Still logged in, dashboard displays |
| 4 | Close browser tab | Tab closed |
| 5 | Open new tab, navigate to app | Previous session restored |

**Pass Criteria:** Session persists across page refreshes and new tabs

---

### Test Case: AUTH-008 - Forgot Password Flow
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to login page | Login form visible |
| 2 | Click "Forgot Password" link | Navigate to `/forgot-password` |
| 3 | Verify forgot password form | Email input field visible |
| 4 | Enter valid email | Email entered |
| 5 | Submit form | Success message or confirmation shown |

**Pass Criteria:** Forgot password form accessible and submittable

---

## 4. Dashboard & Navigation

### Test Case: DASH-001 - Dashboard Load
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin | Login successful |
| 2 | Verify URL | At `/dashboard` or `/` |
| 3 | Check page title | "Dashboard" or similar heading visible |
| 4 | Verify widgets/cards | Statistics cards load with data |
| 5 | Check for loading states | Loading spinners replaced with content |
| 6 | Monitor console | No JavaScript errors |

**Pass Criteria:** Dashboard fully loads with data, no errors

---

### Test Case: DASH-002 - Sidebar Navigation
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin | Dashboard loads |
| 2 | Locate sidebar | Left sidebar visible |
| 3 | Verify main sections exist: | |
| | - Overview (Dashboard, My Tasks) | Section visible |
| | - CRM (Accounts, Opportunities) | Section visible |
| | - Projects | Section visible |
| | - Finance | Section visible (if module enabled) |
| | - AI Tools | Section visible |
| | - Admin | Section visible (admin only) |
| 4 | Click each main section | Section expands/collapses |
| 5 | Verify active state | Current page highlighted in sidebar |

**Pass Criteria:** All navigation sections accessible and functional

---

### Test Case: DASH-003 - Responsive Sidebar
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login and view dashboard | Full sidebar visible on desktop |
| 2 | Resize browser to mobile width (<768px) | Sidebar collapses or becomes hamburger menu |
| 3 | Click hamburger menu (if present) | Sidebar slides out |
| 4 | Navigate to a page | Sidebar closes after selection |

**Pass Criteria:** Sidebar adapts to screen size

---

### Test Case: DASH-004 - Breadcrumb Navigation
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to a nested page (e.g., Account Detail) | Page loads |
| 2 | Check for breadcrumbs | Breadcrumb trail visible |
| 3 | Click parent breadcrumb | Navigate to parent page |

**Pass Criteria:** Breadcrumbs provide clear navigation path

---

### Test Case: DASH-005 - My Tasks Quick View
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to dashboard | Dashboard loads |
| 2 | Locate "My Tasks" widget | Widget visible (if on dashboard) |
| 3 | Verify task count | Number of tasks displayed |
| 4 | Click "View All" or navigate to `/tasks` | Tasks page loads |

**Pass Criteria:** Tasks accessible from dashboard

---

## 5. CRM Module - Accounts

### Test Case: CRM-ACC-001 - Accounts List Page Load
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin | Dashboard loads |
| 2 | Navigate to CRM > Accounts | `/crm/accounts` loads |
| 3 | Verify page title | "Accounts" heading visible |
| 4 | Check table/list | Account records displayed |
| 5 | Verify table columns | Name, Type, Industry, Health, Owner visible |
| 6 | Check pagination | Pagination controls present if >10 records |
| 7 | Verify "New Account" button | Button visible and clickable |

**Pass Criteria:** Accounts page loads with data table

---

### Test Case: CRM-ACC-002 - Create New Account
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/crm/accounts` | Accounts list loads |
| 2 | Click "New Account" button | Create form/modal opens |
| 3 | Fill required fields: | |
| | - Name: "UAT Test Company" | Field populated |
| | - Type: Select "CUSTOMER" | Dropdown selected |
| | - Industry: "Technology" | Field populated |
| 4 | Fill optional fields: | |
| | - Website: "https://uat-test.com" | Field populated |
| | - Phone: "555-123-4567" | Field populated |
| | - Annual Revenue: "1000000" | Field populated |
| 5 | Click "Save" or "Create" | Form submits |
| 6 | Verify success message | Toast/notification: "Account created" |
| 7 | Verify redirect | Redirected to account detail or list |
| 8 | Search for "UAT Test Company" | Account appears in list |

**Pass Criteria:** Account created and visible in list

---

### Test Case: CRM-ACC-003 - Account Detail View
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/crm/accounts` | Accounts list loads |
| 2 | Click on any account name | Account detail page loads |
| 3 | Verify URL pattern | `/crm/accounts/:accountId` |
| 4 | Check account header | Name, type, status displayed |
| 5 | Verify tabs/sections: | |
| | - Overview | Basic info displayed |
| | - Contacts | Contact list or empty state |
| | - Opportunities | Opportunity list or empty state |
| | - Activities | Activity timeline or empty state |
| | - Health | Health score displayed |
| | - CTAs | CTAs list or empty state |
| | - Success Plans | Plans list or empty state |
| 6 | Verify "Edit" button | Edit button visible |

**Pass Criteria:** All account detail sections load correctly

---

### Test Case: CRM-ACC-004 - Edit Account
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to account detail page | Page loads |
| 2 | Click "Edit" button | Edit form opens |
| 3 | Modify account name | Add " - Updated" to name |
| 4 | Change industry | Select different industry |
| 5 | Click "Save" | Form submits |
| 6 | Verify success message | "Account updated" notification |
| 7 | Verify changes persisted | Updated name visible |
| 8 | Refresh page | Changes still present |

**Pass Criteria:** Account updates saved and persisted

---

### Test Case: CRM-ACC-005 - Delete/Archive Account
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create a test account "To Delete" | Account created |
| 2 | Navigate to account detail | Detail page loads |
| 3 | Click "Archive" or "Delete" button | Confirmation dialog appears |
| 4 | Confirm deletion | Action proceeds |
| 5 | Verify success message | "Account archived" notification |
| 6 | Check accounts list | Account no longer visible (or marked archived) |

**Pass Criteria:** Account archived/deleted successfully

---

### Test Case: CRM-ACC-006 - Account Search & Filter
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/crm/accounts` | Accounts list loads |
| 2 | Locate search input | Search field visible |
| 3 | Type partial account name | Search executes |
| 4 | Verify filtered results | Only matching accounts shown |
| 5 | Clear search | All accounts shown again |
| 6 | Use Type filter (e.g., "CUSTOMER") | Only customers shown |
| 7 | Use Industry filter | Filtered by industry |
| 8 | Clear all filters | Full list restored |

**Pass Criteria:** Search and filters work correctly

---

### Test Case: CRM-ACC-007 - Account Health Score
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to account detail | Page loads |
| 2 | Locate "Health" tab/section | Health section visible |
| 3 | Verify health score display | Score 0-100 shown with color indicator |
| 4 | Check health dimensions | Usage, Support, Engagement, Sentiment, Financial |
| 5 | Click "Calculate Health" (if available) | Health recalculates |
| 6 | Check health history | Historical scores shown |

**Pass Criteria:** Health scoring displayed and functional

---

### Test Case: CRM-ACC-008 - Account Hierarchy
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to account with parent | Account detail loads |
| 2 | Check parent account link | Parent account name displayed |
| 3 | Click parent account link | Navigates to parent account |
| 4 | Check child accounts section | Child accounts listed |
| 5 | Verify hierarchy visualization | Tree or list view of hierarchy |

**Pass Criteria:** Parent/child relationships displayed

---

### Test Case: CRM-ACC-009 - Account CTAs Management
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to account detail | Page loads |
| 2 | Go to "CTAs" tab | CTAs section visible |
| 3 | Click "New CTA" button | CTA form opens |
| 4 | Fill CTA fields: | |
| | - Title: "Follow up on renewal" | Field populated |
| | - Type: Select type | Dropdown selected |
| | - Priority: "High" | Priority selected |
| | - Due Date: Future date | Date selected |
| 5 | Save CTA | CTA created |
| 6 | Verify CTA in list | New CTA appears |
| 7 | Click CTA to view/edit | CTA details open |
| 8 | Test "Close" CTA | CTA marked closed |
| 9 | Test "Snooze" CTA | Snooze dialog opens, new date set |

**Pass Criteria:** CTAs CRUD operations work

---

### Test Case: CRM-ACC-010 - Account Success Plans
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to account detail | Page loads |
| 2 | Go to "Success Plans" tab | Success Plans section visible |
| 3 | Click "New Success Plan" | Plan form opens |
| 4 | Fill plan fields: | |
| | - Name: "Q1 Success Plan" | Field populated |
| | - Start Date: Today | Date selected |
| | - Target Date: Future date | Date selected |
| 5 | Save plan | Plan created in DRAFT status |
| 6 | Add objective to plan | Objective form opens |
| 7 | Fill objective: | |
| | - Title: "Increase usage by 20%" | Field populated |
| 8 | Save objective | Objective added |
| 9 | Add task to objective | Task created |
| 10 | Activate success plan | Status changes to ACTIVE |

**Pass Criteria:** Success plans with objectives and tasks work

---

### Test Case: CRM-ACC-011 - Merge Accounts
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create two test accounts | Accounts created |
| 2 | Navigate to first account | Account detail loads |
| 3 | Click "Merge" or find merge option | Merge dialog opens |
| 4 | Select second account to merge | Account selected |
| 5 | Review merge preview | Shows what will be combined |
| 6 | Confirm merge | Merge executes |
| 7 | Verify merged account | Contacts, opportunities, activities combined |
| 8 | Verify duplicate removed | Second account no longer exists |

**Pass Criteria:** Account merge combines all related data

---

## 6. CRM Module - Opportunities

### Test Case: CRM-OPP-001 - Opportunities Page Load
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login and navigate to CRM > Opportunities | `/crm/opportunities` loads |
| 2 | Verify page title | "Opportunities" or "Pipeline" heading |
| 3 | Check view options | List view and/or Kanban view available |
| 4 | Verify pipeline stages displayed | Columns for each stage (Kanban) or stage column (List) |
| 5 | Check "New Opportunity" button | Button visible |
| 6 | Verify opportunity cards/rows | Opportunity data displayed |

**Pass Criteria:** Opportunities page loads with pipeline view

---

### Test Case: CRM-OPP-002 - Kanban Pipeline View
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to opportunities page | Page loads |
| 2 | Switch to Kanban view (if not default) | Kanban board displays |
| 3 | Verify stage columns | Each pipeline stage is a column |
| 4 | Verify opportunity cards | Cards show name, amount, account |
| 5 | Check stage counts | Number of deals per stage shown |
| 6 | Verify weighted totals | Weighted amount per stage displayed |

**Pass Criteria:** Kanban view displays opportunities by stage

---

### Test Case: CRM-OPP-003 - Create New Opportunity
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to opportunities page | Page loads |
| 2 | Click "New Opportunity" | Create form opens |
| 3 | Fill required fields: | |
| | - Name: "UAT Test Deal" | Field populated |
| | - Account: Select an account | Account selected |
| | - Amount: 50000 | Amount entered |
| | - Stage: Select initial stage | Stage selected |
| | - Expected Close Date: Future date | Date selected |
| 4 | Fill optional fields: | |
| | - Probability: 50 | Probability entered |
| | - Description: "Test opportunity" | Description entered |
| 5 | Click "Save" | Form submits |
| 6 | Verify success message | "Opportunity created" notification |
| 7 | Verify opportunity in pipeline | Appears in correct stage |

**Pass Criteria:** Opportunity created and placed in correct pipeline stage

---

### Test Case: CRM-OPP-004 - Drag & Drop Stage Change (Kanban)
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Kanban view | Board displays |
| 2 | Locate an opportunity card | Card visible in a stage |
| 3 | Drag card to next stage | Drag operation starts |
| 4 | Drop card in new stage column | Card moves to new column |
| 5 | Verify stage update | Stage updated (check detail) |
| 6 | Check stage history | New entry in stage history |
| 7 | Refresh page | Card remains in new stage |

**Pass Criteria:** Drag & drop moves opportunities between stages

---

### Test Case: CRM-OPP-005 - Opportunity Detail View
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on opportunity name/card | Detail page loads |
| 2 | Verify URL | `/crm/opportunities/:opportunityId` |
| 3 | Check header info | Name, amount, stage, account displayed |
| 4 | Verify sections: | |
| | - Details | Basic info, dates, owner |
| | - Contacts | Associated contacts |
| | - Activities | Activity timeline |
| | - Stage History | Stage change audit trail |
| 5 | Check probability display | Probability and weighted amount shown |
| 6 | Verify edit capability | Edit button visible |

**Pass Criteria:** Opportunity detail shows all relevant information

---

### Test Case: CRM-OPP-006 - Edit Opportunity
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to opportunity detail | Page loads |
| 2 | Click "Edit" button | Edit form opens |
| 3 | Modify amount | Change to new value |
| 4 | Modify probability | Change percentage |
| 5 | Update expected close date | Select new date |
| 6 | Save changes | Form submits |
| 7 | Verify updates | New values displayed |
| 8 | Check weighted amount | Recalculated (amount × probability) |

**Pass Criteria:** Opportunity edits saved correctly

---

### Test Case: CRM-OPP-007 - Mark Opportunity as Won
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to opportunity detail | Page loads |
| 2 | Click "Mark as Won" button | Action dialog opens |
| 3 | Enter actual close date | Date selected |
| 4 | Confirm action | Opportunity updated |
| 5 | Verify stage changed to "Won" | Stage shows "Closed Won" |
| 6 | Verify probability is 100% | Probability updated |
| 7 | Check stage history | "Won" entry recorded |

**Pass Criteria:** Won opportunities tracked correctly

---

### Test Case: CRM-OPP-008 - Mark Opportunity as Lost
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to opportunity detail | Page loads |
| 2 | Click "Mark as Lost" button | Action dialog opens |
| 3 | Select lost reason | Reason dropdown selected |
| 4 | Add optional notes | Notes entered |
| 5 | Confirm action | Opportunity updated |
| 6 | Verify stage changed to "Lost" | Stage shows "Closed Lost" |
| 7 | Verify lost reason saved | Reason displayed |
| 8 | Check stage history | "Lost" entry with reason recorded |

**Pass Criteria:** Lost opportunities with reasons tracked

---

### Test Case: CRM-OPP-009 - Pipeline Statistics
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to opportunities page | Page loads |
| 2 | Locate pipeline stats/summary | Stats section visible |
| 3 | Verify metrics displayed: | |
| | - Total pipeline value | Sum of all open deals |
| | - Weighted pipeline value | Sum of weighted amounts |
| | - Deal count by stage | Numbers per stage |
| | - Average deal size | Calculated average |
| 4 | Filter opportunities | Stats update to reflect filter |

**Pass Criteria:** Pipeline statistics accurate and update with filters

---

### Test Case: CRM-OPP-010 - Add Contact to Opportunity
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to opportunity detail | Page loads |
| 2 | Go to Contacts section | Contacts tab/section visible |
| 3 | Click "Add Contact" | Contact selection opens |
| 4 | Select a contact | Contact chosen |
| 5 | Set contact role (e.g., "Decision Maker") | Role selected |
| 6 | Save | Contact added |
| 7 | Verify contact in list | Contact appears with role |
| 8 | Remove contact | Contact removed from opportunity |

**Pass Criteria:** Opportunity contacts managed correctly

---

### Test Case: CRM-OPP-011 - Stage History Audit Trail
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to opportunity that has stage changes | Page loads |
| 2 | Locate Stage History section | Section visible |
| 3 | Verify history entries | Each stage change logged |
| 4 | Check entry details: | |
| | - From stage | Previous stage shown |
| | - To stage | New stage shown |
| | - Date/time | Timestamp shown |
| | - User who made change | User name shown |
| | - Duration in previous stage | Days calculated |

**Pass Criteria:** Complete audit trail of stage changes

---

## 7. CRM Module - Activities

### Test Case: CRM-ACT-001 - Log Activity from Account
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to account detail | Page loads |
| 2 | Go to Activities tab | Activities section visible |
| 3 | Click "Log Activity" or "New Activity" | Activity form opens |
| 4 | Select activity type: "CALL" | Type selected |
| 5 | Fill fields: | |
| | - Subject: "Introductory Call" | Subject entered |
| | - Description: "Discussed requirements" | Description entered |
| | - Date: Today | Date selected |
| | - Duration: 30 minutes | Duration entered |
| 6 | Save activity | Activity created |
| 7 | Verify in timeline | Activity appears in account timeline |

**Pass Criteria:** Activities logged and visible in timeline

---

### Test Case: CRM-ACT-002 - Activity Types
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open activity creation form | Form opens |
| 2 | Check activity type dropdown | All types available: |
| | - CALL | Available |
| | - EMAIL | Available |
| | - MEETING | Available |
| | - TASK | Available |
| | - NOTE | Available |
| | - SMS | Available |
| | - LINKEDIN_MESSAGE | Available |
| | - DEMO | Available |
| | - PROPOSAL | Available |
| | - CONTRACT | Available |
| 3 | Create activity for each type | Each type works |

**Pass Criteria:** All activity types can be created

---

### Test Case: CRM-ACT-003 - Quick Log Call
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to account or opportunity | Page loads |
| 2 | Find "Quick Log" or "Log Call" button | Button visible |
| 3 | Click to log call | Simplified form opens |
| 4 | Enter minimal details | Quick entry fields |
| 5 | Save | Call logged |
| 6 | Verify in timeline | Call activity visible |

**Pass Criteria:** Quick call logging streamlined

---

### Test Case: CRM-ACT-004 - Activity Status Management
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create a TASK activity | Task created with PLANNED status |
| 2 | View task in timeline | Status shown |
| 3 | Mark as "In Progress" | Status updated to IN_PROGRESS |
| 4 | Mark as "Complete" | Status updated to COMPLETED |
| 5 | Test "Cancel" action | Status updated to CANCELLED |
| 6 | Verify status colors/badges | Visual indicators for each status |

**Pass Criteria:** Activity status workflow works

---

### Test Case: CRM-ACT-005 - My Upcoming Activities
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create activities with future dates | Activities scheduled |
| 2 | Navigate to dashboard or My Tasks | Page loads |
| 3 | Find "Upcoming Activities" widget | Widget visible |
| 4 | Verify activities listed | Scheduled activities shown |
| 5 | Verify sorted by date | Nearest first |
| 6 | Click activity | Navigate to details |

**Pass Criteria:** Upcoming activities surfaced to user

---

### Test Case: CRM-ACT-006 - Overdue Activities
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create activity with past due date | Overdue activity created |
| 2 | Navigate to dashboard | Page loads |
| 3 | Check for overdue indicator | Warning/alert visible |
| 4 | Verify overdue styling | Red or warning color |
| 5 | Navigate to overdue activities list | List shows overdue items |

**Pass Criteria:** Overdue activities highlighted and tracked

---

## 8. CRM Module - Leads

### Test Case: CRM-LEAD-001 - Leads Page Load
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to CRM > Leads | `/crm/leads` loads |
| 2 | Verify page title | "Inbound Leads" heading |
| 3 | Check leads table | Lead records displayed |
| 4 | Verify columns | Name, Email, Company, Status, Source |
| 5 | Check "New Lead" button | Button visible |

**Pass Criteria:** Leads list page loads with data

---

### Test Case: CRM-LEAD-002 - Create New Lead
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Lead" button | Lead form opens |
| 2 | Fill required fields: | |
| | - Name: "John Test Lead" | Field populated |
| | - Email: "john.lead@test.com" | Field populated |
| | - Company: "Test Corp" | Field populated |
| 3 | Fill optional fields: | |
| | - Phone: "555-999-8888" | Field populated |
| | - Source: "WEBSITE" | Source selected |
| 4 | Save lead | Lead created |
| 5 | Verify in list | Lead appears |

**Pass Criteria:** Lead creation works

---

### Test Case: CRM-LEAD-003 - Convert Lead to Opportunity
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to lead detail | Page loads |
| 2 | Click "Convert" or "Convert to Opportunity" | Conversion dialog opens |
| 3 | Configure conversion: | |
| | - Create Opportunity: Yes | Checkbox checked |
| | - Opportunity Name: "New Deal from Lead" | Name entered |
| | - Amount: 25000 | Amount entered |
| | - Create Account: Yes | Checkbox checked |
| 4 | Confirm conversion | Conversion executes |
| 5 | Verify Account created | New account in accounts list |
| 6 | Verify Opportunity created | New opportunity in pipeline |
| 7 | Verify Lead status | Status changed to "CONVERTED" |

**Pass Criteria:** Lead conversion creates Account and Opportunity

---

### Test Case: CRM-LEAD-004 - Lead Status Updates
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to lead detail | Page loads |
| 2 | Update status to "CONTACTED" | Status changed |
| 3 | Update status to "QUALIFIED" | Status changed |
| 4 | Update status to "NURTURING" | Status changed |
| 5 | Verify status history | Changes tracked |

**Pass Criteria:** Lead status workflow works

---

## 9. Projects Module

### Test Case: PROJ-001 - Projects List Page
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Projects | `/projects` loads |
| 2 | Verify page title | "Projects" heading |
| 3 | Check project cards/list | Project records displayed |
| 4 | Verify project info | Name, status, client/account, dates |
| 5 | Check "New Project" button | Button visible |
| 6 | Test search/filter | Projects filterable |

**Pass Criteria:** Projects list loads with data

---

### Test Case: PROJ-002 - Create New Project
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Project" | `/projects/new` loads |
| 2 | Fill project details: | |
| | - Name: "UAT Test Project" | Field populated |
| | - Account: Select account | Account linked |
| | - Start Date: Today | Date selected |
| | - Target End Date: Future | Date selected |
| | - Description: "Test project" | Description entered |
| 3 | Select project template (if available) | Template selected |
| 4 | Save project | Project created |
| 5 | Verify redirect | Project dashboard loads |
| 6 | Verify in projects list | Project appears |

**Pass Criteria:** Project created successfully

---

### Test Case: PROJ-003 - Project Dashboard
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project detail | `/projects/:id` loads |
| 2 | Verify dashboard widgets: | |
| | - Project status | Status badge visible |
| | - Progress indicator | Progress bar or percentage |
| | - Task summary | Task counts by status |
| | - Milestone timeline | Milestones listed |
| | - Team members | Assigned members shown |
| 3 | Check tabs/sections | Overview, Tasks, Milestones, Meetings |
| 4 | Verify edit capability | Edit button works |

**Pass Criteria:** Project dashboard shows comprehensive view

---

### Test Case: PROJ-004 - Edit Project
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project detail | Page loads |
| 2 | Click "Edit" button | Edit form opens |
| 3 | Modify project name | Name updated |
| 4 | Change status | Status updated |
| 5 | Update dates | Dates changed |
| 6 | Save changes | Changes persisted |
| 7 | Verify updates | New values displayed |

**Pass Criteria:** Project editing works

---

### Test Case: PROJ-005 - Project Status Workflow
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create new project | Status is "PLANNING" or initial |
| 2 | Change status to "IN_PROGRESS" | Status updated |
| 3 | Change status to "ON_HOLD" | Status updated |
| 4 | Change status to "COMPLETED" | Status updated |
| 5 | Change status to "CANCELLED" | Status updated |
| 6 | Verify status colors | Different colors for each status |

**Pass Criteria:** Project status workflow complete

---

### Test Case: PROJ-006 - Project Team Management
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project detail | Page loads |
| 2 | Find team/members section | Section visible |
| 3 | Click "Add Member" | Member selection opens |
| 4 | Select a user | User selected |
| 5 | Assign role (if available) | Role selected |
| 6 | Save | Member added |
| 7 | Verify member in list | Member appears |
| 8 | Remove member | Member removed |

**Pass Criteria:** Project team management works

---

## 10. Tasks & Milestones

### Test Case: TASK-001 - Tasks Page (My Tasks)
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to My Tasks | `/tasks` loads |
| 2 | Verify page title | "My Tasks" heading |
| 3 | Check task list | Tasks assigned to user shown |
| 4 | Verify task info | Title, project, status, due date |
| 5 | Test filters | Filter by status, priority |
| 6 | Test search | Search by task name |

**Pass Criteria:** My Tasks page shows user's tasks

---

### Test Case: TASK-002 - Project Task Board (Kanban)
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project detail | Project loads |
| 2 | Go to Tasks tab | Task board visible |
| 3 | Verify Kanban columns: | |
| | - To Do | Column visible |
| | - In Progress | Column visible |
| | - Review | Column visible |
| | - Done | Column visible |
| 4 | Check task cards | Cards show title, assignee |
| 5 | Verify "Add Task" option | Can add task to board |

**Pass Criteria:** Kanban task board displays correctly

---

### Test Case: TASK-003 - Create Task
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project task board | Board visible |
| 2 | Click "Add Task" or "+" button | Task form opens |
| 3 | Fill task details: | |
| | - Title: "UAT Test Task" | Title entered |
| | - Description: "Test task description" | Description entered |
| | - Assignee: Select user | User assigned |
| | - Priority: "HIGH" | Priority selected |
| | - Due Date: Future date | Date selected |
| 4 | Save task | Task created |
| 5 | Verify task on board | Task appears in "To Do" column |

**Pass Criteria:** Task creation works

---

### Test Case: TASK-004 - Drag & Drop Task Status
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project task board | Board visible |
| 2 | Locate a task card | Card in "To Do" |
| 3 | Drag task to "In Progress" | Drag operation works |
| 4 | Drop task | Task moves to new column |
| 5 | Verify status persisted | Status updated in database |
| 6 | Refresh page | Task remains in new column |

**Pass Criteria:** Drag & drop task status changes work

---

### Test Case: TASK-005 - Edit Task
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on task card | Task detail opens |
| 2 | Click "Edit" | Edit form opens |
| 3 | Modify title | Title changed |
| 4 | Change assignee | Assignee updated |
| 5 | Update priority | Priority changed |
| 6 | Change due date | Date updated |
| 7 | Save | Changes persisted |

**Pass Criteria:** Task editing works

---

### Test Case: TASK-006 - Delete Task
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create a test task | Task created |
| 2 | Open task detail | Detail opens |
| 3 | Click "Delete" button | Confirmation dialog |
| 4 | Confirm deletion | Task deleted |
| 5 | Verify removal | Task no longer on board |

**Pass Criteria:** Task deletion works

---

### Test Case: MILE-001 - View Milestones
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project detail | Project loads |
| 2 | Go to Milestones tab | Milestones section visible |
| 3 | Verify milestone list | Milestones displayed |
| 4 | Check milestone info | Name, date, status |
| 5 | Verify timeline view (if available) | Visual timeline shown |

**Pass Criteria:** Milestones display correctly

---

### Test Case: MILE-002 - Create Milestone
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project milestones | Section visible |
| 2 | Click "Add Milestone" | Milestone form opens |
| 3 | Fill milestone details: | |
| | - Name: "UAT Test Milestone" | Name entered |
| | - Target Date: Future date | Date selected |
| | - Description: "Test milestone" | Description entered |
| 4 | Save milestone | Milestone created |
| 5 | Verify in list | Milestone appears |

**Pass Criteria:** Milestone creation works

---

### Test Case: MILE-003 - Update Milestone Status
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to milestone | Milestone visible |
| 2 | Change status to "IN_PROGRESS" | Status updated |
| 3 | Change status to "COMPLETED" | Status updated |
| 4 | Verify status indicator | Visual feedback |
| 5 | Check completion date | Auto-populated when completed |

**Pass Criteria:** Milestone status workflow works

---

## 11. Meetings Module

### Test Case: MEET-001 - Create Meeting
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project or account | Page loads |
| 2 | Find "Schedule Meeting" or meetings section | Option visible |
| 3 | Click to create meeting | Meeting form opens |
| 4 | Fill meeting details: | |
| | - Title: "UAT Test Meeting" | Title entered |
| | - Date: Future date | Date selected |
| | - Time: Specific time | Time selected |
| | - Duration: 60 minutes | Duration set |
| | - Attendees: Select users | Users added |
| 5 | Save meeting | Meeting created |
| 6 | Verify meeting in list | Meeting appears |

**Pass Criteria:** Meeting creation works

---

### Test Case: MEET-002 - Meeting Detail View
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to meeting detail | `/meetings/:id` loads |
| 2 | Verify meeting info displayed | |
| | - Title and description | Visible |
| | - Date and time | Visible |
| | - Attendees list | Visible |
| | - Related project/account | Link visible |
| 3 | Check notes section | Notes area visible |
| 4 | Check action items section | Action items visible |

**Pass Criteria:** Meeting detail shows all information

---

### Test Case: MEET-003 - Add Meeting Notes
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to meeting detail | Page loads |
| 2 | Find notes editor | Notes section visible |
| 3 | Add notes text | Notes entered |
| 4 | Save notes | Notes persisted |
| 5 | Refresh page | Notes still present |

**Pass Criteria:** Meeting notes saved

---

### Test Case: MEET-004 - Action Items from Meeting
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to meeting detail | Page loads |
| 2 | Add action item | Action item form |
| 3 | Fill action item: | |
| | - Description: "Follow up with client" | Text entered |
| | - Assignee: Select user | User assigned |
| | - Due date: Future date | Date set |
| 4 | Save action item | Item created |
| 5 | Verify item links to task | Task created or linked |

**Pass Criteria:** Action items captured from meetings

---

## 12. Finance Tracking Module

### Test Case: FIN-001 - Finance Dashboard
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Finance | `/finance` loads |
| 2 | Verify dashboard title | "Finance" or "Finance Dashboard" |
| 3 | Check summary widgets: | |
| | - Total Expenses | Amount displayed |
| | - Budget Utilization | Percentage shown |
| | - Pending Approvals | Count displayed |
| | - Recurring Costs | Monthly total |
| 4 | Verify charts | Spending trends, category breakdown |
| 5 | Check quick actions | Links to expenses, budgets |

**Pass Criteria:** Finance dashboard loads with data

---

### Test Case: FIN-002 - Expenses List
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/finance/expenses` | Expenses page loads |
| 2 | Verify expenses table | Expense records displayed |
| 3 | Check columns | Description, Amount, Category, Status, Date |
| 4 | Test filters | Filter by status, category, date range |
| 5 | Test search | Search by description or vendor |
| 6 | Check "New Expense" button | Button visible |

**Pass Criteria:** Expenses list with filtering works

---

### Test Case: FIN-003 - Create Expense
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Expense" | `/finance/expenses/new` loads |
| 2 | Fill expense details: | |
| | - Description: "UAT Test Expense" | Description entered |
| | - Amount: 150.00 | Amount entered |
| | - Category: Select category | Category selected |
| | - Vendor: "Test Vendor" | Vendor entered |
| | - Date: Today | Date selected |
| 3 | Add receipt (if available) | File attached |
| 4 | Save expense | Expense created |
| 5 | Verify status is "PENDING" | Status shown |
| 6 | Verify in expenses list | Expense appears |

**Pass Criteria:** Expense creation works

---

### Test Case: FIN-004 - Expense Approval Workflow
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create pending expense | Expense in PENDING status |
| 2 | Login as admin/approver | Admin logged in |
| 3 | Navigate to expense detail | Detail page loads |
| 4 | Click "Approve" button | Approval dialog opens |
| 5 | Confirm approval | Expense approved |
| 6 | Verify status is "APPROVED" | Status updated |
| 7 | Test "Reject" flow | Create another expense |
| 8 | Click "Reject" | Rejection dialog opens |
| 9 | Enter rejection reason | Reason entered |
| 10 | Confirm rejection | Expense rejected |
| 11 | Verify status is "REJECTED" | Status updated |

**Pass Criteria:** Expense approval workflow complete

---

### Test Case: FIN-005 - Mark Expense as Paid
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to approved expense | Detail loads |
| 2 | Click "Mark as Paid" | Payment dialog opens |
| 3 | Enter payment date | Date selected |
| 4 | Confirm | Expense marked paid |
| 5 | Verify status is "PAID" | Status updated |

**Pass Criteria:** Payment tracking works

---

### Test Case: FIN-006 - Budget Management
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/finance/budgets` | Budgets page loads |
| 2 | Verify budget list | Budgets displayed |
| 3 | Click "New Budget" | Budget form opens |
| 4 | Fill budget details: | |
| | - Name: "Q1 Marketing Budget" | Name entered |
| | - Category: Select category | Category selected |
| | - Amount: 10000 | Amount entered |
| | - Period: Monthly/Quarterly | Period selected |
| | - Start Date: First of month | Date selected |
| 5 | Save budget | Budget created |
| 6 | Verify utilization display | 0% utilized initially |
| 7 | Add expenses to budget category | Expenses added |
| 8 | Check utilization updates | Percentage increases |

**Pass Criteria:** Budget tracking works

---

### Test Case: FIN-007 - Recurring Costs
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/finance/recurring-costs` | Page loads |
| 2 | Verify recurring costs list | Subscriptions displayed |
| 3 | Click "New Recurring Cost" | Form opens |
| 4 | Fill recurring cost: | |
| | - Name: "Test Subscription" | Name entered |
| | - Amount: 99.00 | Amount entered |
| | - Frequency: Monthly | Frequency selected |
| | - Next Due Date: Future date | Date selected |
| | - Vendor: "SaaS Company" | Vendor entered |
| 5 | Save | Recurring cost created |
| 6 | Verify next due date | Shows when payment due |
| 7 | Test "Generate Expense" | Creates expense from recurring |

**Pass Criteria:** Recurring cost management works

---

### Test Case: FIN-008 - AI Expense Categorization
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create new expense | Form opens |
| 2 | Enter description: "Adobe Creative Cloud subscription" | Description entered |
| 3 | Check for AI suggestion | Category suggested automatically |
| 4 | Verify suggestion makes sense | "Software" or similar suggested |
| 5 | Accept or override suggestion | Category applied |

**Pass Criteria:** AI categorization provides reasonable suggestions

---

## 13. Bug Tracking Module

### Test Case: BUG-001 - Issues List Page
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Bug Tracking | `/bug-tracking` loads |
| 2 | Verify page title | "Issues" or "Bug Tracking" |
| 3 | Check issues table | Issue records displayed |
| 4 | Verify columns | Title, Status, Priority, Assignee, Created |
| 5 | Test filters | Filter by status, priority |
| 6 | Test search | Search by issue title |
| 7 | Check "New Issue" button | Button visible |

**Pass Criteria:** Issues list loads correctly

---

### Test Case: BUG-002 - Create Issue
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Issue" | Issue form opens |
| 2 | Fill issue details: | |
| | - Title: "UAT Test Bug" | Title entered |
| | - Description: "Steps to reproduce..." | Description entered |
| | - Priority: "HIGH" | Priority selected |
| | - Assignee: Select user | User assigned |
| 3 | Add labels/tags (if available) | Tags added |
| 4 | Save issue | Issue created |
| 5 | Verify in list | Issue appears |

**Pass Criteria:** Issue creation works

---

### Test Case: BUG-003 - Issue Detail View
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on issue title | `/bug-tracking/:id` loads |
| 2 | Verify issue details | Title, description, status visible |
| 3 | Check metadata | Priority, assignee, dates |
| 4 | Verify comments section | Comments area visible |
| 5 | Check activity log | History of changes shown |
| 6 | Verify edit capability | Edit button visible |

**Pass Criteria:** Issue detail shows all information

---

### Test Case: BUG-004 - Update Issue Status
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to issue detail | Page loads |
| 2 | Change status to "IN_PROGRESS" | Status updated |
| 3 | Change status to "RESOLVED" | Status updated |
| 4 | Change status to "CLOSED" | Status updated |
| 5 | Verify status history | Changes logged |

**Pass Criteria:** Issue status workflow works

---

### Test Case: BUG-005 - Add Comment to Issue
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to issue detail | Page loads |
| 2 | Find comment input | Comment field visible |
| 3 | Enter comment text | Comment entered |
| 4 | Submit comment | Comment posted |
| 5 | Verify comment in list | Comment appears with timestamp |
| 6 | Verify author shown | Your username displayed |

**Pass Criteria:** Issue comments work

---

### Test Case: BUG-006 - API Keys Management
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Bug Tracking | Page loads |
| 2 | Find "API Keys" tab | Tab visible |
| 3 | Click API Keys tab | API Keys section loads |
| 4 | Click "Generate API Key" | Key creation dialog |
| 5 | Enter key name: "Test Integration" | Name entered |
| 6 | Generate key | Key created and displayed |
| 7 | Copy key (note: shown only once) | Key copied |
| 8 | Verify key in list | Key appears (masked) |
| 9 | Test revoke key | Key revoked |

**Pass Criteria:** API key management works

---

## 14. Admin Module - Users

### Test Case: ADMIN-USER-001 - Users List Page
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin | Admin dashboard |
| 2 | Navigate to Admin > Users | `/admin/users` loads |
| 3 | Verify page title | "Users" heading |
| 4 | Check users table | User records displayed |
| 5 | Verify columns | Name, Email, Role, Status |
| 6 | Test search | Search by name or email |
| 7 | Test role filter | Filter by Admin/Consultant |
| 8 | Check "New User" button | Button visible |

**Pass Criteria:** Users list loads correctly

---

### Test Case: ADMIN-USER-002 - Create New User
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New User" | `/admin/users/new` loads |
| 2 | Fill user details: | |
| | - Name: "UAT Test User" | Name entered |
| | - Email: "uat.user@test.com" | Email entered |
| | - Role: "CONSULTANT" | Role selected |
| | - Password: "TestPass123!" | Password entered |
| 3 | Save user | User created |
| 4 | Verify in users list | User appears |
| 5 | Logout and login as new user | Login works |

**Pass Criteria:** User creation works and new user can login

---

### Test Case: ADMIN-USER-003 - Edit User
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to user detail | `/admin/users/:id` loads |
| 2 | Click "Edit" button | Edit form opens |
| 3 | Modify user name | Name changed |
| 4 | Change role | Role updated |
| 5 | Save changes | Changes persisted |
| 6 | Verify updates | New values displayed |

**Pass Criteria:** User editing works

---

### Test Case: ADMIN-USER-004 - Deactivate User
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to user detail | Page loads |
| 2 | Click "Deactivate" or toggle status | Confirmation dialog |
| 3 | Confirm deactivation | User deactivated |
| 4 | Verify status changed | Status shows "Inactive" |
| 5 | Try logging in as deactivated user | Login fails |

**Pass Criteria:** User deactivation prevents login

---

### Test Case: ADMIN-USER-005 - Role-Based Access Control
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as consultant | Consultant logged in |
| 2 | Try accessing `/admin/users` | Access denied or redirected |
| 3 | Verify admin menu hidden | Admin section not in sidebar |
| 4 | Login as admin | Admin logged in |
| 5 | Access `/admin/users` | Page loads successfully |
| 6 | Verify admin menu visible | Admin section in sidebar |

**Pass Criteria:** Role-based access enforced

---

## 15. Admin Module - Modules & Tenants

### Test Case: ADMIN-MOD-001 - Modules Configuration
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin | Admin logged in |
| 2 | Navigate to Admin > Modules | `/admin/modules` loads |
| 3 | Verify modules list | All modules displayed |
| 4 | Check module status | Enabled/Disabled status shown |
| 5 | Toggle a module off | Module disabled |
| 6 | Verify module route hidden | Route no longer accessible |
| 7 | Toggle module on | Module re-enabled |
| 8 | Verify module route works | Route accessible again |

**Pass Criteria:** Module toggling works

---

### Test Case: ADMIN-TEN-001 - Tenant List (System Admin)
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as system admin | Admin logged in |
| 2 | Navigate to Admin > Tenants | `/admin/tenants` loads |
| 3 | Verify tenants list | Tenant organizations displayed |
| 4 | Check tenant info | Name, status, created date |
| 5 | Check "New Tenant" button | Button visible |

**Pass Criteria:** Tenant list displays

---

### Test Case: ADMIN-TEN-002 - Create Tenant
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Tenant" | Tenant form opens |
| 2 | Fill tenant details: | |
| | - Name: "UAT Test Tenant" | Name entered |
| | - Subdomain: "uat-test" | Subdomain entered |
| 3 | Save tenant | Tenant created |
| 4 | Verify in list | Tenant appears |

**Pass Criteria:** Tenant creation works

---

### Test Case: ADMIN-HEALTH-001 - Tenant Health Dashboard
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Admin > Health | `/admin/health` loads |
| 2 | Verify health metrics | System health displayed |
| 3 | Check database status | Connection status shown |
| 4 | Check API health | API status shown |
| 5 | Verify monitoring graphs | Usage graphs displayed |

**Pass Criteria:** Health dashboard shows system status

---

## 16. AI Tools - Phase 1

### Test Case: AI-CHAT-001 - Chatbot Configuration
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Chatbot | `/ai-tools/chatbot` loads |
| 2 | Verify page sections: | |
| | - Configuration | Config form visible |
| | - Knowledge Base | KB section visible |
| | - Conversations | Conversations list |
| | - Analytics | Analytics dashboard |
| 3 | Check widget customization | Colors, messages configurable |
| 4 | Enable/disable chatbot | Toggle works |
| 5 | Save configuration | Config saved |

**Pass Criteria:** Chatbot configuration loads

---

### Test Case: AI-CHAT-002 - Knowledge Base Management
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Chatbot Knowledge Base | Section loads |
| 2 | Click "Add FAQ" | FAQ form opens |
| 3 | Enter question | Question entered |
| 4 | Enter answer | Answer entered |
| 5 | Add keywords | Keywords added |
| 6 | Save FAQ | FAQ created |
| 7 | Verify in list | FAQ appears |
| 8 | Edit FAQ | Modification works |
| 9 | Delete FAQ | FAQ removed |

**Pass Criteria:** Knowledge base CRUD works

---

### Test Case: AI-CHAT-003 - View Conversations
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Conversations | Section loads |
| 2 | View conversation list | Conversations displayed |
| 3 | Click on a conversation | Conversation detail opens |
| 4 | View message thread | Messages displayed |
| 5 | Check customer info | Customer details shown |
| 6 | Verify timestamps | Message times displayed |

**Pass Criteria:** Conversation viewing works

---

### Test Case: AI-PROD-001 - Product Descriptions
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Product Descriptions | `/ai-tools/product-descriptions` loads |
| 2 | Verify page loads | Page displays without errors |
| 3 | Check configuration options | Settings available |
| 4 | Test generation (if data available) | Generation triggers |

**Pass Criteria:** Product Descriptions page accessible

---

### Test Case: AI-SCHED-001 - Scheduling Assistant
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Scheduling | `/ai-tools/scheduling` loads |
| 2 | Verify page sections: | |
| | - Calendar integrations | Integration options visible |
| | - Booking settings | Settings form visible |
| | - Availability | Availability configuration |
| 3 | Test calendar connection (if credentials available) | OAuth flow works |
| 4 | Configure availability | Settings saved |

**Pass Criteria:** Scheduling configuration accessible

---

### Test Case: AI-INTAKE-001 - Client Intake
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Intake | `/ai-tools/intake` loads |
| 2 | Verify page loads | No errors |
| 3 | Check form builder (if available) | Form creation works |
| 4 | Check submissions list | Submissions displayed |

**Pass Criteria:** Intake module accessible

---

## 17. AI Tools - Phase 2

### Test Case: AI-DOC-001 - Document Analyzer
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Document Analyzer | `/ai-tools/document-analyzer` loads |
| 2 | Verify page sections: | |
| | - Upload area | File upload visible |
| | - Templates | Extraction templates |
| | - Analyzed documents | Document list |
| 3 | Test document upload | Upload works |
| 4 | Check analysis results | Extraction displayed |
| 5 | View extraction templates | Templates listed |

**Pass Criteria:** Document Analyzer page accessible

---

### Test Case: AI-CONTENT-001 - Content Generator
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Content Generator | `/ai-tools/content-generator` loads |
| 2 | Verify page sections | Configuration, templates visible |
| 3 | Test content generation | Generation works |
| 4 | Check generated content | Content displayed |

**Pass Criteria:** Content Generator accessible

---

### Test Case: AI-LEAD-001 - Lead Scoring
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Lead Scoring | `/ai-tools/lead-scoring` loads |
| 2 | Verify page sections | Scoring rules, leads list |
| 3 | Check scoring configuration | Settings visible |
| 4 | Verify lead scores displayed | Scores shown on leads |

**Pass Criteria:** Lead Scoring accessible

---

### Test Case: AI-PRIOR-001 - Prior Authorization
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Prior Authorization | `/ai-tools/prior-auth` loads |
| 2 | Verify page loads | No errors |
| 3 | Check authorization list | Authorizations displayed |
| 4 | Check status tracking | Status workflow visible |

**Pass Criteria:** Prior Authorization accessible

---

## 18. AI Tools - Phase 3

### Test Case: AI-INV-001 - Inventory Forecasting
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Inventory Forecasting | `/ai-tools/inventory-forecasting` loads |
| 2 | Verify page loads | No errors |
| 3 | Check forecasting configuration | Settings visible |
| 4 | View forecast data | Forecasts displayed |

**Pass Criteria:** Inventory Forecasting accessible

---

### Test Case: AI-COMP-001 - Compliance Monitor
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Compliance Monitor | `/ai-tools/compliance-monitor` loads |
| 2 | Verify page loads | No errors |
| 3 | Check compliance rules | Rules listed |
| 4 | View compliance status | Status dashboard visible |

**Pass Criteria:** Compliance Monitor accessible

---

### Test Case: AI-PRED-001 - Predictive Maintenance
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Predictive Maintenance | `/ai-tools/predictive-maintenance` loads |
| 2 | Verify page loads | No errors |
| 3 | Check equipment list | Equipment displayed |
| 4 | View predictions | Maintenance predictions shown |

**Pass Criteria:** Predictive Maintenance accessible

---

### Test Case: AI-REV-001 - Revenue Management
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Revenue Management | `/ai-tools/revenue-management` loads |
| 2 | Verify page loads | No errors |
| 3 | Check pricing configuration | Settings visible |
| 4 | View revenue analytics | Analytics displayed |

**Pass Criteria:** Revenue Management accessible

---

### Test Case: AI-SAFE-001 - Safety Monitor
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Safety Monitor | `/ai-tools/safety-monitor` loads |
| 2 | Verify page loads | No errors |
| 3 | Check safety checklists | Checklists visible |
| 4 | View incident reports | Reports listed |

**Pass Criteria:** Safety Monitor accessible

---

## 19. Operations Dashboard

### Test Case: OPS-001 - Operations Dashboard
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin | Admin logged in |
| 2 | Navigate to Operations | `/operations` loads |
| 3 | Verify dashboard widgets | System health displayed |
| 4 | Check key metrics | Metrics visible |
| 5 | Verify navigation to sub-pages | Links work |

**Pass Criteria:** Operations dashboard accessible

---

### Test Case: OPS-002 - AI Usage Page
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Operations > AI Usage | `/operations/ai-usage` loads |
| 2 | Verify usage charts | Charts displayed |
| 3 | Check cost tracking | Costs shown |
| 4 | Verify model breakdown | Usage by model visible |
| 5 | Check date range filter | Filter works |

**Pass Criteria:** AI usage tracking works

---

### Test Case: OPS-003 - Infrastructure Health
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Operations > Infrastructure | `/operations/infrastructure` loads |
| 2 | Verify service status | Services listed |
| 3 | Check health indicators | Green/red status |
| 4 | View response times | Latency displayed |

**Pass Criteria:** Infrastructure monitoring works

---

## 20. Marketing Module

### Test Case: MKT-001 - Marketing Content Page
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Marketing | `/marketing` loads |
| 2 | Verify content list | Content items displayed |
| 3 | Check "New Content" button | Button visible |
| 4 | Verify filters | Filter by type, status |

**Pass Criteria:** Marketing content page loads

---

### Test Case: MKT-002 - Create Marketing Content
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Content" | Content form opens |
| 2 | Fill content details: | |
| | - Title: "UAT Test Content" | Title entered |
| | - Type: "BLOG_POST" | Type selected |
| | - Content: Rich text | Content entered |
| 3 | Save as draft | Content saved |
| 4 | Verify in list | Content appears |

**Pass Criteria:** Marketing content creation works

---

### Test Case: MKT-003 - Content Publishing Workflow
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to draft content | Detail page loads |
| 2 | Submit for review | Status changes to "REVIEW" |
| 3 | Approve content | Status changes to "APPROVED" |
| 4 | Publish content | Status changes to "PUBLISHED" |
| 5 | Verify publish date | Timestamp recorded |

**Pass Criteria:** Publishing workflow works

---

## 21. Assets Module

### Test Case: ASSET-001 - Assets Page
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Assets | `/assets` loads |
| 2 | Verify assets list | Asset records displayed |
| 3 | Check asset types | Types visible |
| 4 | Test search | Search works |

**Pass Criteria:** Assets page loads

---

### Test Case: ASSET-002 - Create Asset
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Asset" | Asset form opens |
| 2 | Fill asset details | Details entered |
| 3 | Save asset | Asset created |
| 4 | Verify in list | Asset appears |

**Pass Criteria:** Asset creation works

---

## 22. Cross-Cutting Concerns

### Test Case: CROSS-001 - Error Handling
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to invalid URL | Error page shown |
| 2 | Verify 404 page | "Page not found" message |
| 3 | Navigate back | Return to valid page |
| 4 | Try invalid form submission | Validation errors shown |
| 5 | Check API error handling | Friendly error messages |

**Pass Criteria:** Errors handled gracefully

---

### Test Case: CROSS-002 - Loading States
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to data-heavy page | Loading indicator shown |
| 2 | Wait for data load | Content replaces loader |
| 3 | Submit a form | Loading state on button |
| 4 | Verify no flash of empty content | Smooth transitions |

**Pass Criteria:** Loading states provide feedback

---

### Test Case: CROSS-003 - Form Validation
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open any form | Form displays |
| 2 | Submit without required fields | Validation errors shown |
| 3 | Enter invalid email format | Email validation error |
| 4 | Enter invalid date | Date validation error |
| 5 | Enter negative number where positive required | Number validation error |
| 6 | Fill all fields correctly | Form submits successfully |

**Pass Criteria:** Form validation works

---

### Test Case: CROSS-004 - Responsive Design
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View dashboard at 1920px width | Full desktop layout |
| 2 | Resize to 1024px (tablet) | Layout adjusts |
| 3 | Resize to 768px | Sidebar collapses |
| 4 | Resize to 375px (mobile) | Mobile layout |
| 5 | Check touch targets | Buttons easily tappable |
| 6 | Check text readability | Text scales appropriately |

**Pass Criteria:** Responsive design works at all breakpoints

---

### Test Case: CROSS-005 - Notifications/Toasts
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Perform successful action (create record) | Success toast appears |
| 2 | Verify toast content | Clear success message |
| 3 | Wait for auto-dismiss | Toast disappears |
| 4 | Trigger error | Error toast appears |
| 5 | Check toast is dismissible | Can click to dismiss |

**Pass Criteria:** Toast notifications work

---

### Test Case: CROSS-006 - Browser Console Errors
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open browser DevTools console | Console visible |
| 2 | Navigate through all main pages | Check for errors |
| 3 | Perform common actions | Check for errors |
| 4 | Verify no JavaScript errors | Console clean |
| 5 | Check for React warnings | Minimal warnings |

**Pass Criteria:** No JavaScript errors in console

---

### Test Case: CROSS-007 - API Response Handling
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Network tab in DevTools | Network visible |
| 2 | Perform CRUD operations | Monitor API calls |
| 3 | Verify successful responses (200, 201) | Success codes |
| 4 | Check for failed requests (4xx, 5xx) | Investigate failures |
| 5 | Verify response times | Reasonable latency |

**Pass Criteria:** API calls successful with good performance

---

### Test Case: CROSS-008 - Data Persistence
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create a new record | Record created |
| 2 | Refresh the page | Record still visible |
| 3 | Logout and login again | Record persists |
| 4 | Edit the record | Changes saved |
| 5 | Refresh page | Changes persisted |
| 6 | Delete the record | Record removed |
| 7 | Refresh page | Record not visible |

**Pass Criteria:** Data persists across sessions

---

### Test Case: CROSS-009 - Session Timeout
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login and note session | Session active |
| 2 | Wait for session timeout (or simulate) | Session expires |
| 3 | Try to perform action | Redirected to login |
| 4 | Verify graceful handling | No data loss |

**Pass Criteria:** Session timeout handled gracefully

---

### Test Case: CROSS-010 - Concurrent Editing Warning
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open record in two browser tabs | Same record open |
| 2 | Edit in tab 1 and save | Changes saved |
| 3 | Edit in tab 2 and save | Warning shown (if implemented) |
| 4 | Verify data integrity | Latest changes preserved |

**Pass Criteria:** Concurrent editing doesn't cause data loss

---

## Appendix A: Test Execution Checklist

Use this checklist to track test execution progress:

```markdown
## UAT Execution Progress

**Tester:** [AI Agent Name]
**Date Started:** [Date]
**Environment:** [Dev/Staging/Production]

### Module Completion Status

| Module | Total Tests | Passed | Failed | Blocked | Status |
|--------|-------------|--------|--------|---------|--------|
| Authentication | 8 | | | | ⬜ Not Started |
| Dashboard | 5 | | | | ⬜ Not Started |
| CRM - Accounts | 11 | | | | ⬜ Not Started |
| CRM - Opportunities | 11 | | | | ⬜ Not Started |
| CRM - Activities | 6 | | | | ⬜ Not Started |
| CRM - Leads | 4 | | | | ⬜ Not Started |
| Projects | 6 | | | | ⬜ Not Started |
| Tasks & Milestones | 9 | | | | ⬜ Not Started |
| Meetings | 4 | | | | ⬜ Not Started |
| Finance | 8 | | | | ⬜ Not Started |
| Bug Tracking | 6 | | | | ⬜ Not Started |
| Admin - Users | 5 | | | | ⬜ Not Started |
| Admin - Modules/Tenants | 4 | | | | ⬜ Not Started |
| AI Tools Phase 1 | 6 | | | | ⬜ Not Started |
| AI Tools Phase 2 | 4 | | | | ⬜ Not Started |
| AI Tools Phase 3 | 5 | | | | ⬜ Not Started |
| Operations | 3 | | | | ⬜ Not Started |
| Marketing | 3 | | | | ⬜ Not Started |
| Assets | 2 | | | | ⬜ Not Started |
| Cross-Cutting | 10 | | | | ⬜ Not Started |

### Legend
- ⬜ Not Started
- 🔄 In Progress
- ✅ Completed - All Passed
- ⚠️ Completed - Has Failures
- 🚫 Blocked
```

---

## Appendix B: Error Report Template

```markdown
## Error Report: [Module] - [Test Case ID]

### Summary
**Test Case:** [Test case title]
**Severity:** [Critical/High/Medium/Low]
**Status:** Open

### Environment
- **Browser:** Chrome 120.0.x
- **Screen Size:** 1920x1080
- **User Role:** Admin
- **Timestamp:** [Date/Time]

### Steps to Reproduce
1.
2.
3.

### Expected Result
[What should happen]

### Actual Result
[What actually happened]

### Error Details

**UI Error Message:**
```
[Exact error text shown in UI]
```

**Console Errors:**
```javascript
[JavaScript console errors]
```

**Network Errors:**
```
[Failed API calls - method, URL, status code, response]
```

### Visual Evidence
[Describe screenshot or attach reference]

### Additional Notes
[Any other relevant information]

### Recommended Fix
[Suggestion if obvious]
```

---

## Appendix C: Test Data Requirements

### Required Test Data

Before running UAT, ensure the database contains:

| Entity | Minimum Count | Notes |
|--------|---------------|-------|
| Users | 4 | 1 admin, 3 consultants |
| Accounts | 10 | Mix of types (CUSTOMER, PROSPECT) |
| Opportunities | 15 | Various stages |
| Contacts | 20 | Linked to accounts |
| Projects | 5 | Various statuses |
| Tasks | 20 | Distributed across projects |
| Milestones | 10 | Some completed, some pending |
| Leads | 5 | Various statuses |
| Expenses | 10 | Mix of statuses |
| Budgets | 3 | Different categories |

### Seed Command
```bash
cd pmo
npx prisma db seed
```

---

## Appendix D: Module Dependencies

Some tests require specific modules to be enabled:

| Test Area | Required Modules |
|-----------|------------------|
| Finance Tests | `financeTracking` |
| Bug Tracking Tests | `bugTracking` |
| Marketing Tests | `marketing` |
| Assets Tests | `assets` |
| Leads Tests | `leads` |
| AI Chatbot Tests | `chatbot` |
| Document Analyzer Tests | `documentAnalyzer` |
| All Phase 1-3 AI Tests | Respective module enabled |

Ensure `PMO_MODULES` environment variable includes all required modules.

---

**End of UAT Document**

*Version 1.0 - Created 2026-01-02*
