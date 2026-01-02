# User Acceptance Testing (UAT) Guide

## AI CRM Platform - Comprehensive UAT Documentation

**Version:** 2.0
**Last Updated:** 2026-01-02
**Purpose:** This document provides detailed test cases for an AI agent to systematically validate all features of the AI CRM Platform, including edge cases and error scenarios.

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

**IMPORTANT: Use these credentials for all testing**

| Role | Email | Password | Use Case |
|------|-------|----------|----------|
| **Admin (Primary)** | `Admin@pmo.test` | `Seattleu21*` | **USE THIS FOR ALL TESTING** |
| **Admin (Backup)** | `admin@pmo.test` | `AdminDemo123!` | Fallback if primary fails |
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
- [ ] Network tab in DevTools is accessible

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
| 5 | Inspect browser console | No JavaScript errors |

**Pass Criteria:** All elements render correctly without console errors

---

### Test Case: AUTH-002 - Successful Admin Login
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to login page | Login form visible |
| 2 | Enter email: `Admin@pmo.test` | Email field populated |
| 3 | Enter password: `Seattleu21*` | Password field populated (masked) |
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
| 1 | Login as `Admin@pmo.test` | Dashboard loads |
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
| 1 | Login as `Admin@pmo.test` | Dashboard loads |
| 2 | Refresh the browser (F5) | Page reloads |
| 3 | Verify login state | Still logged in, dashboard displays |
| 4 | Close browser tab | Tab closed |
| 5 | Open new tab, navigate to app | Previous session restored |

**Pass Criteria:** Session persists across page refreshes and new tabs

---

### Test Case: AUTH-008 - Invalid Email Format (Edge Case)
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to login page | Login form visible |
| 2 | Enter email: `notanemail` | Invalid email entered |
| 3 | Enter password: `SomePassword123!` | Password entered |
| 4 | Click "Sign In" | Validation triggers |
| 5 | Verify error | "Invalid email format" or similar shown |

**Pass Criteria:** Email format validation works

---

### Test Case: AUTH-009 - SQL Injection Attempt (Security Edge Case)
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to login page | Login form visible |
| 2 | Enter email: `admin@pmo.test' OR '1'='1` | Injection attempt |
| 3 | Enter password: `' OR '1'='1` | Injection attempt |
| 4 | Click "Sign In" | Form submits |
| 5 | Verify result | Login fails with "Invalid credentials" (NOT SQL error) |

**Pass Criteria:** SQL injection properly sanitized

---

### Test Case: AUTH-010 - XSS Attempt (Security Edge Case)
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to login page | Login form visible |
| 2 | Enter email: `<script>alert('xss')</script>@test.com` | XSS attempt |
| 3 | Enter password: `password` | Password entered |
| 4 | Click "Sign In" | Form submits |
| 5 | Verify result | No script execution, proper error shown |
| 6 | Inspect page source | Script tags are escaped/sanitized |

**Pass Criteria:** XSS properly prevented

---

### Test Case: AUTH-011 - Case Sensitivity Test
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to login page | Login form visible |
| 2 | Enter email: `ADMIN@PMO.TEST` (uppercase) | Email entered |
| 3 | Enter password: `Seattleu21*` | Correct password |
| 4 | Click "Sign In" | Login attempt |
| 5 | Verify result | Login succeeds (email should be case-insensitive) |

**Pass Criteria:** Email matching is case-insensitive

---

### Test Case: AUTH-012 - Password with Special Characters (Edge Case)
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to login page | Login form visible |
| 2 | Enter email: `Admin@pmo.test` | Email entered |
| 3 | Enter password with special chars: `Seattleu21*` | Password with * |
| 4 | Click "Sign In" | Login attempt |
| 5 | Verify result | Login succeeds |

**Pass Criteria:** Special characters in password handled correctly

---

### Test Case: AUTH-013 - Rapid Login Attempts (Rate Limiting)
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to login page | Login form visible |
| 2 | Attempt login with wrong password 5 times rapidly | Multiple failed attempts |
| 3 | Check for rate limiting | Warning or temporary lockout shown |
| 4 | Wait appropriate time | Lockout expires |
| 5 | Try correct credentials | Login succeeds |

**Pass Criteria:** Rate limiting protects against brute force (if implemented)

---

## 4. Dashboard & Navigation

### Test Case: DASH-001 - Dashboard Load
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `Admin@pmo.test` | Login successful |
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
| 1 | Login as `Admin@pmo.test` | Dashboard loads |
| 2 | Locate sidebar | Left sidebar visible |
| 3 | Verify main sections exist: | |
| | - Overview (Dashboard, My Tasks) | Section visible |
| | - CRM (Accounts, Opportunities) | Section visible |
| | - Projects | Section visible |
| | - Finance | Section visible (if module enabled) |
| | - Bug Tracking | Section visible (if module enabled) |
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
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to CRM > Accounts | Accounts list loads |
| 2 | Click on an account name | Account detail page loads |
| 3 | Check for breadcrumbs | Breadcrumb trail visible: Home > CRM > Accounts > [Account Name] |
| 4 | Click "Accounts" in breadcrumb | Navigate back to accounts list |
| 5 | Click "Home" icon in breadcrumb | Navigate to dashboard |

**Pass Criteria:** Breadcrumbs provide clear navigation path

---

### Test Case: DASH-005 - My Tasks Quick View
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to dashboard | Dashboard loads |
| 2 | Locate "My Tasks" widget or navigate to `/tasks` | Tasks visible |
| 3 | Verify task count | Number of tasks displayed |
| 4 | Click on a task | Task detail opens |

**Pass Criteria:** Tasks accessible from dashboard

---

### Test Case: DASH-006 - Navigation to All Main Sections
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin | Dashboard loads |
| 2 | Navigate to each sidebar item: | |
| | - Dashboard | `/dashboard` loads |
| | - My Tasks | `/tasks` loads |
| | - Accounts | `/crm/accounts` loads |
| | - Opportunities | `/crm/opportunities` loads |
| | - Leads | `/crm/leads` or `/leads` loads |
| | - Projects | `/projects` loads |
| | - Finance | `/finance` loads |
| | - Bug Tracking | `/bug-tracking` loads |
| | - Admin > Users | `/admin/users` loads |
| 3 | Verify no errors on each page | All pages load without errors |

**Pass Criteria:** All main navigation items work

---

### Test Case: DASH-007 - Direct URL Navigation
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin | Dashboard loads |
| 2 | Manually enter URL: `/crm/accounts` | Accounts page loads |
| 3 | Manually enter URL: `/crm/accounts/999999` (non-existent) | Error handled gracefully |
| 4 | Manually enter URL: `/nonexistent-page` | 404 page or redirect |

**Pass Criteria:** Direct URL navigation works, errors handled

---

### Test Case: DASH-008 - Browser Back/Forward Navigation
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login and navigate to Dashboard | Dashboard loads |
| 2 | Click to Accounts | Accounts page loads |
| 3 | Click to specific Account detail | Detail page loads |
| 4 | Click browser Back button | Returns to Accounts list |
| 5 | Click browser Back button | Returns to Dashboard |
| 6 | Click browser Forward button | Returns to Accounts list |

**Pass Criteria:** Browser history navigation works correctly

---

## 5. CRM Module - Accounts

### Test Case: CRM-ACC-001 - Accounts List Page Load
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `Admin@pmo.test` | Dashboard loads |
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
| 4 | Check breadcrumb navigation | Shows: Home > CRM > Accounts > [Account Name] |
| 5 | Check account header | Name, type, status displayed |
| 6 | Verify sections visible: | |
| | - Basic info (name, website, phone, industry) | Displayed |
| | - Health Score | Score 0-100 displayed |
| | - Opportunities summary | Count and value shown |
| | - CTAs section | CTAs list visible |
| | - Success Plans section | Plans list visible |
| 7 | Verify "Edit" button | Edit button visible |

**Pass Criteria:** All account detail sections load correctly

---

### Test Case: CRM-ACC-004 - Edit Account
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to account detail page | Page loads |
| 2 | Click "Edit" button | Edit mode activates (inline or modal) |
| 3 | Modify account name | Add " - Updated" to name |
| 4 | Change industry | Select different industry |
| 5 | Change type | Select different type (e.g., PROSPECT) |
| 6 | Click "Save" | Form submits |
| 7 | Verify success message | "Account updated" notification |
| 8 | Verify changes persisted | Updated name visible |
| 9 | Refresh page | Changes still present |

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
| 2 | Locate Health Score section | Health section visible |
| 3 | Verify health score display | Score 0-100 shown with color indicator |
| 4 | Check health label | "Healthy", "At Risk", or "Critical" based on score |
| 5 | Click "Recalculate Health" button | Health recalculates |
| 6 | Verify loading state | Button shows loading during calculation |
| 7 | Verify score updates | New score displayed |

**Pass Criteria:** Health scoring displayed and recalculation works

---

### Test Case: CRM-ACC-008 - Account Hierarchy
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to account with parent (if exists) | Account detail loads |
| 2 | Check parent account link | Parent account name displayed (if set) |
| 3 | Click parent account link | Navigates to parent account |
| 4 | Check child accounts section | Child accounts listed (if any) |

**Pass Criteria:** Parent/child relationships displayed

---

### Test Case: CRM-ACC-009 - Account CTAs Management
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to account detail | Page loads |
| 2 | Scroll to "CTAs" section | CTAs section visible |
| 3 | Click "New CTA" or "+" button | CTA form modal opens |
| 4 | Fill CTA fields: | |
| | - Name/Title: "Follow up on renewal" | Field populated |
| | - Type: Select "RISK" | Dropdown shows: RISK, OPPORTUNITY, LIFECYCLE, ACTIVITY, OBJECTIVE |
| | - Priority: "HIGH" | Priority selected |
| | - Due Date: Future date | Date selected |
| 5 | Save CTA | CTA created |
| 6 | Verify CTA in list | New CTA appears |
| 7 | Click on CTA to view details | CTA details shown |

**Pass Criteria:** CTAs CRUD operations work

---

### Test Case: CRM-ACC-010 - Account Success Plans
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to account detail | Page loads |
| 2 | Scroll to "Success Plans" section | Success Plans section visible |
| 3 | Click "New Success Plan" or "+" | Plan form modal opens |
| 4 | Fill plan fields: | |
| | - Name: "Q1 Success Plan" | Field populated |
| | - Start Date: Today | Date selected |
| | - Target Date: Future date | Date selected |
| 5 | Save plan | Plan created in DRAFT status |
| 6 | Verify plan in list | New plan appears |

**Pass Criteria:** Success plans creation works

---

### Test Case: CRM-ACC-011 - Empty Account Name (Edge Case)
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Account" | Form opens |
| 2 | Leave Name field empty | Empty |
| 3 | Fill other required fields | Fields populated |
| 4 | Click "Save" | Validation triggers |
| 5 | Verify error | "Name is required" error shown |

**Pass Criteria:** Empty name validation works

---

### Test Case: CRM-ACC-012 - Very Long Account Name (Edge Case)
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Account" | Form opens |
| 2 | Enter 500+ character name | Very long name |
| 3 | Click "Save" | Form submits or validation triggers |
| 4 | Verify result | Either truncated, error shown, or saved with proper display |

**Pass Criteria:** Long names handled gracefully

---

### Test Case: CRM-ACC-013 - Special Characters in Account Name (Edge Case)
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Account" | Form opens |
| 2 | Enter name with special chars: "Test & Co. <LLC>" | Special chars entered |
| 3 | Fill other required fields | Fields populated |
| 4 | Click "Save" | Account created |
| 5 | View account detail | Name displayed correctly (HTML escaped) |

**Pass Criteria:** Special characters handled properly

---

### Test Case: CRM-ACC-014 - Invalid Website URL (Edge Case)
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Edit an account | Edit mode active |
| 2 | Enter invalid website: "not-a-url" | Invalid URL entered |
| 3 | Click "Save" | Validation triggers |
| 4 | Verify error | "Invalid URL format" or similar |

**Pass Criteria:** URL validation works

---

### Test Case: CRM-ACC-015 - Negative Revenue (Edge Case)
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Edit an account | Edit mode active |
| 2 | Enter negative revenue: "-50000" | Negative number entered |
| 3 | Click "Save" | Validation triggers |
| 4 | Verify error | "Revenue must be positive" or value rejected |

**Pass Criteria:** Negative numbers handled

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
| 3 | Check breadcrumb | Home > CRM > Opportunities > [Name] |
| 4 | Check header info | Name, amount, stage, account displayed |
| 5 | Verify sections: | |
| | - Details | Basic info, dates, owner |
| | - Contacts | Associated contacts |
| | - Activities | Activity timeline |
| | - Stage History | Stage change audit trail |
| 6 | Check probability display | Probability and weighted amount shown |
| 7 | Verify edit capability | Edit button visible |

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
| 3 | Enter actual close date (if prompted) | Date selected |
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

### Test Case: CRM-OPP-009 - Zero Amount Opportunity (Edge Case)
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create new opportunity | Form opens |
| 2 | Enter amount: 0 | Zero amount |
| 3 | Fill other required fields | Fields populated |
| 4 | Save | Either accepted or validation error |
| 5 | If saved, verify display | Shows $0 or appropriate display |

**Pass Criteria:** Zero amounts handled gracefully

---

### Test Case: CRM-OPP-010 - Very Large Amount (Edge Case)
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create new opportunity | Form opens |
| 2 | Enter amount: 999999999999 | Very large number |
| 3 | Save | Form submits |
| 4 | Verify display | Number formatted correctly (with commas/abbreviation) |

**Pass Criteria:** Large numbers displayed properly

---

### Test Case: CRM-OPP-011 - Past Close Date (Edge Case)
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create new opportunity | Form opens |
| 2 | Set expected close date to past | Yesterday's date |
| 3 | Save | Form submits or warns |
| 4 | Check for indicator | Overdue indicator or warning shown |

**Pass Criteria:** Past dates handled appropriately

---

## 7. CRM Module - Activities

### Test Case: CRM-ACT-001 - Log Activity from Account
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to account detail | Page loads |
| 2 | Find "Log Activity" or activity section | Activity form/section visible |
| 3 | Select activity type: "CALL" | Type selected |
| 4 | Fill fields: | |
| | - Subject: "Introductory Call" | Subject entered |
| | - Description: "Discussed requirements" | Description entered |
| | - Date: Today | Date selected |
| 5 | Save activity | Activity created |
| 6 | Verify in timeline | Activity appears |

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
| 3 | Create one activity of each type | Each type works |

**Pass Criteria:** All activity types can be created

---

### Test Case: CRM-ACT-003 - Empty Activity Subject (Edge Case)
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open activity form | Form opens |
| 2 | Leave subject empty | Empty |
| 3 | Try to save | Validation triggers |
| 4 | Verify error | "Subject is required" error |

**Pass Criteria:** Empty subject validation works

---

## 8. CRM Module - Leads

### Test Case: CRM-LEAD-001 - Leads Page Load
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to CRM > Leads or Leads | `/crm/leads` or `/leads` loads |
| 2 | Verify page title | "Leads" or "Inbound Leads" heading |
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
| 4 | Confirm conversion | Conversion executes |
| 5 | Verify Opportunity created | New opportunity in pipeline |
| 6 | Verify Lead status | Status changed to "CONVERTED" |

**Pass Criteria:** Lead conversion creates Opportunity

---

### Test Case: CRM-LEAD-004 - Duplicate Email Lead (Edge Case)
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create lead with email: "duplicate@test.com" | Lead created |
| 2 | Try to create another lead with same email | Form submitted |
| 3 | Check result | Either duplicate warning or allowed with note |

**Pass Criteria:** Duplicate emails handled appropriately

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
| 2 | Verify breadcrumb | Home > Projects > New Project |
| 3 | Fill project details: | |
| | - Name: "UAT Test Project" | Field populated |
| | - Account: Select account | Account linked |
| | - Start Date: Today | Date selected |
| | - Target End Date: Future | Date selected |
| | - Description: "Test project" | Description entered |
| 4 | Select project template (if available) | Template selected |
| 5 | Save project | Project created |
| 6 | Verify redirect | Project dashboard loads |
| 7 | Verify in projects list | Project appears |

**Pass Criteria:** Project created successfully

---

### Test Case: PROJ-003 - Project Dashboard Overview Tab
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project detail | `/projects/:id` loads |
| 2 | Verify "Overview" tab is default | Overview tab active |
| 3 | Check overview content: | |
| | - Project status badge | Status visible |
| | - Start/End dates | Dates displayed correctly (no timezone issues) |
| | - Description | Description shown |
| | - Progress indicator | Progress visible |
| 4 | Verify date format | Dates show correct day (not off by one) |

**Pass Criteria:** Overview tab shows correct project information

---

### Test Case: PROJ-004 - Project Dashboard Tasks Tab
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project detail | Page loads |
| 2 | Click "Tasks" tab | Tasks tab activates |
| 3 | Verify Kanban board | Board with columns visible |
| 4 | Check columns: To Do, In Progress, Review, Done | All columns present |
| 5 | Verify task cards | Tasks displayed in columns |
| 6 | Click "Add Task" | Task creation form opens |
| 7 | Create a task | Task appears on board |

**Pass Criteria:** Tasks tab with Kanban board works

---

### Test Case: PROJ-005 - Project Dashboard Meetings Tab
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project detail | Page loads |
| 2 | Click "Meetings" tab | Meetings tab activates |
| 3 | Verify meetings list | Meetings displayed or empty state |
| 4 | Click to create meeting | Meeting form opens |
| 5 | Create a meeting | Meeting appears in list |

**Pass Criteria:** Meetings tab works

---

### Test Case: PROJ-006 - Project Dashboard Assets Tab
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project detail | Page loads |
| 2 | Click "Assets" tab | Assets tab activates |
| 3 | Verify assets section | Assets displayed or empty state |
| 4 | Check "Link Asset" option | Can link existing asset |
| 5 | Check "Create Asset" option | Can create new asset |

**Pass Criteria:** Assets tab works

---

### Test Case: PROJ-007 - Project Dashboard Marketing Tab
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project detail | Page loads |
| 2 | Click "Marketing" tab | Marketing tab activates |
| 3 | Verify marketing content list | Content displayed or empty state |
| 4 | Check "Create Content" option | Content creation available |

**Pass Criteria:** Marketing tab works

---

### Test Case: PROJ-008 - Project Dashboard Team Tab
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project detail | Page loads |
| 2 | Click "Team" tab | Team tab activates |
| 3 | Verify team members list | Members displayed |
| 4 | Check "Add Member" option | Can add team member |
| 5 | Add a member | Member appears in list |
| 6 | Remove a member | Member removed |

**Pass Criteria:** Team tab works

---

### Test Case: PROJ-009 - Project Dashboard Status Tab
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project detail | Page loads |
| 2 | Click "Status" or "Status & Reporting" tab | Status tab activates |
| 3 | Verify status updates | Status history or form visible |
| 4 | Add status update | Update form available |

**Pass Criteria:** Status tab works

---

### Test Case: PROJ-010 - Edit Project
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project detail | Page loads |
| 2 | Click "Edit" button (usually in header) | Edit mode activates |
| 3 | Modify project name | Name updated |
| 4 | Change status | Status updated |
| 5 | Update dates | Dates changed |
| 6 | Save changes | Changes persisted |
| 7 | Verify updates | New values displayed |

**Pass Criteria:** Project editing works

---

### Test Case: PROJ-011 - Project Status Workflow
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create new project | Status is "PLANNING" or initial |
| 2 | Change status to "IN_PROGRESS" | Status updated |
| 3 | Change status to "ON_HOLD" | Status updated |
| 4 | Change status to "COMPLETED" | Status updated |
| 5 | Verify status colors | Different colors for each status |

**Pass Criteria:** Project status workflow complete

---

### Test Case: PROJ-012 - Project Date Display (Timezone Edge Case)
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create project with start date "2026-01-15" | Date entered |
| 2 | Save project | Project created |
| 3 | View project in list | Date shows "Jan 15, 2026" (NOT Jan 14) |
| 4 | View project detail | Date shows "Jan 15, 2026" (NOT Jan 14) |
| 5 | Refresh page | Date remains correct |

**Pass Criteria:** Dates display correctly without timezone shift

---

### Test Case: PROJ-013 - Empty Project Name (Edge Case)
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Project" | Form opens |
| 2 | Leave name empty | Empty |
| 3 | Try to save | Validation triggers |
| 4 | Verify error | "Name is required" error shown |

**Pass Criteria:** Empty name validation works

---

### Test Case: PROJ-014 - End Date Before Start Date (Edge Case)
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Edit a project | Edit mode active |
| 2 | Set end date before start date | Invalid date range |
| 3 | Save | Validation triggers |
| 4 | Verify error | "End date must be after start date" or similar |

**Pass Criteria:** Date validation works

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

### Test Case: TASK-002 - Create Task from Project
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

### Test Case: TASK-003 - Drag & Drop Task Status
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

### Test Case: TASK-004 - Edit Task
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on task card | Task detail opens |
| 2 | Click "Edit" | Edit form opens |
| 3 | Modify title | Title changed |
| 4 | Change assignee | Assignee updated |
| 5 | Update priority | Priority changed |
| 6 | Save | Changes persisted |

**Pass Criteria:** Task editing works

---

### Test Case: TASK-005 - Delete Task
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

### Test Case: TASK-006 - Empty Task Title (Edge Case)
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open task creation form | Form opens |
| 2 | Leave title empty | Empty |
| 3 | Try to save | Validation triggers |
| 4 | Verify error | "Title is required" error |

**Pass Criteria:** Empty title validation works

---

### Test Case: MILE-001 - View Milestones
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project that has milestones | Project loads |
| 2 | Find milestones section (Overview or separate) | Milestones visible |
| 3 | Verify milestone info | Name, date, status |

**Pass Criteria:** Milestones display correctly

---

### Test Case: MILE-002 - Create Milestone
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project | Project loads |
| 2 | Find "Add Milestone" option | Button visible |
| 3 | Click to add | Milestone form opens |
| 4 | Fill milestone details: | |
| | - Name: "UAT Test Milestone" | Name entered |
| | - Target Date: Future date | Date selected |
| 5 | Save milestone | Milestone created |
| 6 | Verify in list | Milestone appears |

**Pass Criteria:** Milestone creation works

---

## 11. Meetings Module

### Test Case: MEET-001 - Create Meeting
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project meetings tab | Meetings visible |
| 2 | Click "Schedule Meeting" or "+" | Meeting form opens |
| 3 | Fill meeting details: | |
| | - Title: "UAT Test Meeting" | Title entered |
| | - Date: Future date | Date selected |
| | - Time: Specific time | Time selected |
| 4 | Save meeting | Meeting created |
| 5 | Verify meeting in list | Meeting appears |

**Pass Criteria:** Meeting creation works

---

### Test Case: MEET-002 - Meeting Detail View
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on a meeting | Detail opens |
| 2 | Verify info displayed | Title, date, time, description |
| 3 | Check notes section | Notes area visible |

**Pass Criteria:** Meeting detail shows information

---

## 12. Finance Tracking Module

### Test Case: FIN-001 - Finance Dashboard
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Finance | `/finance` loads |
| 2 | Verify dashboard title | "Finance" or "Finance Dashboard" |
| 3 | Check summary widgets | Expenses, budgets visible |
| 4 | Check navigation links | Links to expenses, budgets, recurring costs |

**Pass Criteria:** Finance dashboard loads with data

---

### Test Case: FIN-002 - Expenses List
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/finance/expenses` | Expenses page loads |
| 2 | Verify expenses table | Expense records displayed |
| 3 | Check columns | Description, Amount, Category, Status, Date |
| 4 | Check "New Expense" button | Button visible |

**Pass Criteria:** Expenses list loads correctly

---

### Test Case: FIN-003 - Create Expense
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Expense" | `/finance/expenses/new` loads |
| 2 | Verify form loads completely | All fields visible (not blank) |
| 3 | Fill expense details: | |
| | - Description: "UAT Test Expense" | Description entered |
| | - Amount: 150.00 | Amount entered |
| | - Category: Select category | Category selected |
| | - Vendor: "Test Vendor" | Vendor entered |
| | - Date: Today | Date selected |
| 4 | Save expense | Expense created |
| 5 | Verify in list | Expense appears |

**Pass Criteria:** Expense creation works

---

### Test Case: FIN-004 - Expense Approval Workflow
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to pending expense detail | Detail page loads |
| 2 | Click "Approve" button | Approval executes |
| 3 | Verify status is "APPROVED" | Status updated |
| 4 | Test reject flow on another expense | |
| 5 | Click "Reject" | Rejection dialog opens |
| 6 | Enter reason and confirm | Expense rejected |

**Pass Criteria:** Expense approval workflow works

---

### Test Case: FIN-005 - Budget Management
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/finance/budgets` | Budgets page loads |
| 2 | Verify budget list | Budgets displayed |
| 3 | Click "New Budget" | Budget form opens |
| 4 | Fill budget details | Details entered |
| 5 | Save budget | Budget created |

**Pass Criteria:** Budget creation works

---

### Test Case: FIN-006 - Recurring Costs List
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/finance/recurring-costs` | Page loads |
| 2 | Verify recurring costs list | Costs displayed or empty state |

**Pass Criteria:** Recurring costs page loads

---

### Test Case: FIN-007 - Create Recurring Cost
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Recurring Cost" | Form loads |
| 2 | Verify form loads completely | All fields visible |
| 3 | Fill recurring cost: | |
| | - Name: "Test Subscription" | Name entered |
| | - Amount: 99.00 | Amount entered |
| | - Type: Select from dropdown | SUBSCRIPTION, LICENSE, PAYROLL, etc. |
| | - Frequency: Monthly | WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, SEMIANNUALLY, YEARLY |
| | - Start Date: Today | Date selected |
| | - Next Due Date: Future date | Date selected |
| | - Category: Select category | Category selected |
| 4 | Save | Recurring cost created |
| 5 | Verify in list | Cost appears |

**Pass Criteria:** Recurring cost creation works

---

### Test Case: FIN-008 - Expense Detail View with Breadcrumb
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to expense list | List loads |
| 2 | Click on an expense | Detail page loads |
| 3 | Verify breadcrumb | Home > Finance > Expenses > [Description] |
| 4 | Click "Expenses" in breadcrumb | Returns to list |

**Pass Criteria:** Expense detail with navigation works

---

### Test Case: FIN-009 - Negative Expense Amount (Edge Case)
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create new expense | Form opens |
| 2 | Enter negative amount: -50 | Negative entered |
| 3 | Save | Validation triggers |
| 4 | Verify error | "Amount must be positive" or similar |

**Pass Criteria:** Negative amounts rejected

---

### Test Case: FIN-010 - Zero Amount Expense (Edge Case)
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create new expense | Form opens |
| 2 | Enter amount: 0 | Zero entered |
| 3 | Save | Either validation error or saved |

**Pass Criteria:** Zero amounts handled

---

## 13. Bug Tracking Module

### Test Case: BUG-001 - Issues List Page
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Bug Tracking | `/bug-tracking` loads |
| 2 | Verify page title | "Issues" or "Bug Tracking" |
| 3 | Check issues table | Issue records displayed |
| 4 | Verify columns | Title, Status, Priority, Assignee |
| 5 | Check "New Issue" button | Button visible |

**Pass Criteria:** Issues list loads correctly (not API Keys page)

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
| 3 | Save issue | Issue created |
| 4 | Verify in list | Issue appears |

**Pass Criteria:** Issue creation works

---

### Test Case: BUG-003 - Issue Detail View with Breadcrumb
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on issue title | `/bug-tracking/:id` loads |
| 2 | Verify breadcrumb | Home > Bug Tracking > Issues > #[ID] |
| 3 | Verify issue details | Title, description, status visible |
| 4 | Check comments section | Comments area visible |

**Pass Criteria:** Issue detail shows all information

---

### Test Case: BUG-004 - Update Issue Status
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to issue detail | Page loads |
| 2 | Change status to "IN_PROGRESS" | Status updated |
| 3 | Change status to "RESOLVED" | Status updated |
| 4 | Verify status in list | Updated status shown |

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
| 5 | Verify comment in list | Comment appears |

**Pass Criteria:** Issue comments work

---

### Test Case: BUG-006 - API Keys Page (Separate Route)
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/bug-tracking/api-keys` | API Keys page loads |
| 2 | Verify page content | API Keys management, not issues list |
| 3 | Check "Generate API Key" button | Button visible |

**Pass Criteria:** API Keys has its own route, not confused with issue detail

---

## 14. Admin Module - Users

### Test Case: ADMIN-USER-001 - Users List Page
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `Admin@pmo.test` | Admin dashboard |
| 2 | Navigate to Admin > Users | `/admin/users` loads |
| 3 | Verify page title | "Users" heading |
| 4 | Check users table | User records displayed |
| 5 | Verify columns | Name, Email, Role, Status |

**Pass Criteria:** Users list loads correctly

---

### Test Case: ADMIN-USER-002 - Create New User
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New User" | User form loads |
| 2 | Fill user details: | |
| | - Name: "UAT Test User" | Name entered |
| | - Email: "uat.user@test.com" | Email entered |
| | - Role: "CONSULTANT" | Role selected |
| | - Password: "TestPass123!" | Password entered |
| 3 | Save user | User created |
| 4 | Verify in users list | User appears |

**Pass Criteria:** User creation works

---

### Test Case: ADMIN-USER-003 - Role-Based Access Control
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as consultant (non-admin) | Consultant logged in |
| 2 | Try accessing `/admin/users` | Access denied or redirected |
| 3 | Verify admin menu hidden | Admin section not in sidebar |
| 4 | Login as `Admin@pmo.test` | Admin logged in |
| 5 | Access `/admin/users` | Page loads successfully |

**Pass Criteria:** Role-based access enforced

---

## 15. Admin Module - Modules & Tenants

### Test Case: ADMIN-MOD-001 - Modules Configuration
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `Admin@pmo.test` | Admin logged in |
| 2 | Navigate to Admin > Modules | `/admin/modules` loads |
| 3 | Verify modules list | All modules displayed |
| 4 | Check module status | Enabled/Disabled status shown |

**Pass Criteria:** Modules configuration accessible

---

### Test Case: ADMIN-TEN-001 - Tenant List
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin | Admin logged in |
| 2 | Navigate to Admin > Tenants | `/admin/tenants` loads |
| 3 | Verify tenants list | Tenant organizations displayed |

**Pass Criteria:** Tenant list displays

---

## 16. AI Tools - Phase 1

### Test Case: AI-CHAT-001 - Chatbot Page
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Chatbot | `/ai-tools/chatbot` loads |
| 2 | Verify page loads | No errors, configuration visible |

**Pass Criteria:** Chatbot page accessible

---

### Test Case: AI-PROD-001 - Product Descriptions
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Product Descriptions | `/ai-tools/product-descriptions` loads |
| 2 | Verify page loads | No errors |

**Pass Criteria:** Product Descriptions page accessible

---

### Test Case: AI-SCHED-001 - Scheduling Assistant
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Scheduling | `/ai-tools/scheduling` loads |
| 2 | Verify page loads | No errors |

**Pass Criteria:** Scheduling page accessible

---

### Test Case: AI-INTAKE-001 - Client Intake
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Intake | `/ai-tools/intake` loads |
| 2 | Verify page loads | No errors |

**Pass Criteria:** Intake page accessible

---

## 17. AI Tools - Phase 2

### Test Case: AI-DOC-001 - Document Analyzer
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Document Analyzer | `/ai-tools/document-analyzer` loads |
| 2 | Verify page loads | Upload area visible |

**Pass Criteria:** Document Analyzer page accessible

---

### Test Case: AI-CONTENT-001 - Content Generator
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Content Generator | `/ai-tools/content-generator` loads |
| 2 | Verify page loads | No errors |

**Pass Criteria:** Content Generator accessible

---

### Test Case: AI-LEAD-001 - Lead Scoring
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Lead Scoring | `/ai-tools/lead-scoring` loads |
| 2 | Verify page loads | No errors |

**Pass Criteria:** Lead Scoring accessible

---

### Test Case: AI-PRIOR-001 - Prior Authorization
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Prior Authorization | `/ai-tools/prior-auth` loads |
| 2 | Verify page loads | No errors |

**Pass Criteria:** Prior Authorization accessible

---

## 18. AI Tools - Phase 3

### Test Case: AI-INV-001 - Inventory Forecasting
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Inventory Forecasting | `/ai-tools/inventory-forecasting` loads |
| 2 | Verify page loads | No errors |

**Pass Criteria:** Inventory Forecasting accessible

---

### Test Case: AI-COMP-001 - Compliance Monitor
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Compliance Monitor | `/ai-tools/compliance-monitor` loads |
| 2 | Verify page loads | No errors |

**Pass Criteria:** Compliance Monitor accessible

---

### Test Case: AI-PRED-001 - Predictive Maintenance
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Predictive Maintenance | `/ai-tools/predictive-maintenance` loads |
| 2 | Verify page loads | No errors |

**Pass Criteria:** Predictive Maintenance accessible

---

### Test Case: AI-REV-001 - Revenue Management
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Revenue Management | `/ai-tools/revenue-management` loads |
| 2 | Verify page loads | No errors |

**Pass Criteria:** Revenue Management accessible

---

### Test Case: AI-SAFE-001 - Safety Monitor
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Safety Monitor | `/ai-tools/safety-monitor` loads |
| 2 | Verify page loads | No errors |

**Pass Criteria:** Safety Monitor accessible

---

## 19. Operations Dashboard

### Test Case: OPS-001 - Operations Dashboard
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin | Admin logged in |
| 2 | Navigate to Operations | `/operations` loads |
| 3 | Verify dashboard visible | System metrics displayed |

**Pass Criteria:** Operations dashboard accessible

---

### Test Case: OPS-002 - AI Usage Page
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Operations > AI Usage | `/operations/ai-usage` loads |
| 2 | Verify usage data | Charts or data displayed |

**Pass Criteria:** AI usage tracking accessible

---

## 20. Marketing Module

### Test Case: MKT-001 - Marketing Content Page
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Marketing | `/marketing` loads |
| 2 | Verify content list | Content items displayed or empty state |

**Pass Criteria:** Marketing content page loads

---

### Test Case: MKT-002 - Create Marketing Content
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Content" | Content form opens |
| 2 | Fill content details | Details entered |
| 3 | Save | Content created |

**Pass Criteria:** Marketing content creation works

---

## 21. Assets Module

### Test Case: ASSET-001 - Assets Page
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Assets | `/assets` loads |
| 2 | Verify assets list | Asset records displayed or empty state |

**Pass Criteria:** Assets page loads

---

### Test Case: ASSET-002 - Create Asset
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Asset" | Asset form opens |
| 2 | Fill asset details | Details entered |
| 3 | Save asset | Asset created |

**Pass Criteria:** Asset creation works

---

## 22. Cross-Cutting Concerns

### Test Case: CROSS-001 - 404 Error Handling
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to invalid URL `/nonexistent-page-xyz` | Error page shown |
| 2 | Verify 404 page | "Page not found" message |
| 3 | Check for navigation home | Link to return to dashboard |

**Pass Criteria:** 404 errors handled gracefully

---

### Test Case: CROSS-002 - Loading States
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to data-heavy page (Accounts) | Loading indicator shown |
| 2 | Wait for data load | Content replaces loader |
| 3 | Submit a form | Loading state on button |

**Pass Criteria:** Loading states provide feedback

---

### Test Case: CROSS-003 - Form Validation (Comprehensive)
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open account creation form | Form displays |
| 2 | Submit without required fields | Validation errors shown |
| 3 | Enter invalid email format | Email validation error |
| 4 | Enter invalid URL | URL validation error |
| 5 | Enter negative where positive required | Number validation error |
| 6 | Fill all fields correctly | Form submits successfully |

**Pass Criteria:** Form validation works comprehensively

---

### Test Case: CROSS-004 - Responsive Design
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View dashboard at 1920px width | Full desktop layout |
| 2 | Resize to 1024px (tablet) | Layout adjusts |
| 3 | Resize to 768px | Sidebar collapses |
| 4 | Resize to 375px (mobile) | Mobile layout |

**Pass Criteria:** Responsive design works at all breakpoints

---

### Test Case: CROSS-005 - Toast Notifications
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create an account (successful action) | Success toast appears |
| 2 | Verify toast content | Clear success message |
| 3 | Wait for auto-dismiss | Toast disappears |
| 4 | Trigger error (invalid form) | Error toast appears |

**Pass Criteria:** Toast notifications work

---

### Test Case: CROSS-006 - Browser Console Errors
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open browser DevTools console | Console visible |
| 2 | Navigate through ALL main pages | Check for errors |
| 3 | Perform common actions | Check for errors |
| 4 | Document any JavaScript errors | Errors noted |

**Pass Criteria:** Minimal JavaScript errors in console

---

### Test Case: CROSS-007 - API Response Handling
**Priority:** High

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Network tab in DevTools | Network visible |
| 2 | Perform CRUD operations | Monitor API calls |
| 3 | Verify successful responses (200, 201) | Success codes |
| 4 | Note any failed requests (4xx, 5xx) | Document failures |

**Pass Criteria:** API calls successful

---

### Test Case: CROSS-008 - Data Persistence
**Priority:** Critical

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create a new account | Account created |
| 2 | Refresh the page | Account still visible |
| 3 | Logout and login again | Account persists |
| 4 | Edit the account | Changes saved |
| 5 | Delete the account | Account removed |

**Pass Criteria:** Data persists across sessions

---

### Test Case: CROSS-009 - Special Characters Handling
**Priority:** Medium

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create account with name: `Test <script>alert('xss')</script>` | Account created |
| 2 | View account | Name displayed safely (no script execution) |
| 3 | Create with unicode: `Test Café 日本語` | Unicode handled |
| 4 | View | Unicode displayed correctly |

**Pass Criteria:** Special characters and unicode handled safely

---

### Test Case: CROSS-010 - Concurrent Session Test
**Priority:** Low

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login in Tab 1 | Session active |
| 2 | Login in Tab 2 (same browser) | Second session |
| 3 | Perform action in Tab 1 | Action succeeds |
| 4 | Perform action in Tab 2 | Action succeeds |
| 5 | Logout in Tab 1 | Tab 1 logged out |
| 6 | Check Tab 2 | Tab 2 state (may still work or redirect) |

**Pass Criteria:** Multiple tabs handled appropriately

---

## Appendix A: Test Execution Checklist

```markdown
## UAT Execution Progress

**Tester:** AI Agent
**Login:** Admin@pmo.test / Seattleu21*
**Date Started:** [Date]
**Environment:** Development

### Module Completion Status

| Module | Total Tests | Passed | Failed | Blocked | Status |
|--------|-------------|--------|--------|---------|--------|
| Authentication | 13 | | | | ⬜ Not Started |
| Dashboard & Navigation | 8 | | | | ⬜ Not Started |
| CRM - Accounts | 15 | | | | ⬜ Not Started |
| CRM - Opportunities | 11 | | | | ⬜ Not Started |
| CRM - Activities | 3 | | | | ⬜ Not Started |
| CRM - Leads | 4 | | | | ⬜ Not Started |
| Projects | 14 | | | | ⬜ Not Started |
| Tasks & Milestones | 8 | | | | ⬜ Not Started |
| Meetings | 2 | | | | ⬜ Not Started |
| Finance | 10 | | | | ⬜ Not Started |
| Bug Tracking | 6 | | | | ⬜ Not Started |
| Admin - Users | 3 | | | | ⬜ Not Started |
| Admin - Modules/Tenants | 2 | | | | ⬜ Not Started |
| AI Tools Phase 1 | 4 | | | | ⬜ Not Started |
| AI Tools Phase 2 | 4 | | | | ⬜ Not Started |
| AI Tools Phase 3 | 5 | | | | ⬜ Not Started |
| Operations | 2 | | | | ⬜ Not Started |
| Marketing | 2 | | | | ⬜ Not Started |
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

## Appendix B: Test Data Requirements

### Required Test Data

Before running UAT, ensure the database contains:

| Entity | Minimum Count | Notes |
|--------|---------------|-------|
| Users | 4 | 1 admin, 3 consultants |
| Accounts | 10 | Mix of types (CUSTOMER, PROSPECT) |
| Opportunities | 15 | Various stages |
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

## Appendix C: Known Issues to Verify Fixed

The following issues were identified in previous UAT and should be verified as fixed:

| Issue | Description | Fix Applied |
|-------|-------------|-------------|
| Account Editing | Account editing was failing with "Request failed" | Added `ownerId` field to updateAccountSchema |
| CTA Creation | CTA type options didn't match backend | Fixed type options to match schema |
| Expense Form | Form was loading blank page | Fixed projectsData access pattern |
| Recurring Cost | Creation was failing silently | Fixed type/frequency enums |
| Bug Tracking Route | /bug-tracking/:id was matching /bug-tracking/api-keys | Reordered routes |
| Date Display | Dates were off by one day | Fixed timezone handling |
| Health Score | No recalculate button | Added recalculate button |
| Breadcrumbs | Missing breadcrumb navigation | Added Breadcrumb component |

---

**End of UAT Document**

*Version 2.0 - Updated 2026-01-02*
*Primary Login: Admin@pmo.test / Seattleu21**
