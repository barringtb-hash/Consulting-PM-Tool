# UAT Testing Script v6.0

## AI CRM Platform - Comprehensive User Acceptance Testing with Tenant Isolation

**Version:** 6.0
**Last Updated:** January 6, 2026
**Purpose:** Complete UAT with Full Multi-Tenant Isolation Testing
**Application URL:** https://verdanthorizon.ai

---

## What's New in V6.0

This version builds upon UAT v5.0 with comprehensive **multi-tenant isolation testing** to ensure complete data separation:

- **NEW: Multi-Tenant Seed Data** - Three distinct tenants with deliberately overlapping entity names
- **NEW: Tenant Isolation Testing (TI)** - 50+ test cases for cross-tenant data isolation
- **NEW: Authentication Tenant Binding (TI-AUTH)** - Tests that user auth is properly bound to tenant
- **NEW: CRM Tenant Isolation (TI-CRM)** - Accounts, Opportunities, Contacts isolation tests
- **NEW: PMO Tenant Isolation (TI-PMO)** - Projects, Tasks, Meetings isolation tests
- **NEW: Finance Tenant Isolation (TI-FIN)** - Expenses, Budgets, Recurring Costs isolation tests
- **NEW: Admin Cross-Tenant (TI-ADM)** - Admin boundary enforcement tests
- **NEW: API Direct Access (TI-API)** - Direct API calls attempting cross-tenant access
- **Includes all v5.0 tests** - Dark mode, visual consistency, color accuracy, button testing

---

## Table of Contents

### Part A: Setup & Environment
1. [Pre-Test Setup](#1-pre-test-setup)
2. [Multi-Tenant Environment Setup](#2-multi-tenant-environment-setup)

### Part B: Core Functionality (from v5.0)
3. [Authentication (AUTH)](#3-authentication-auth)
4. [Navigation (NAV)](#4-navigation-nav)
5. [CRM Accounts (CRM-ACC)](#5-crm-accounts-crm-acc)
6. [CRM Opportunities (CRM-OPP)](#6-crm-opportunities-crm-opp)
7. [CRM Contacts (CRM-CON)](#7-crm-contacts-crm-con)
8. [PMO Projects (PMO-PRJ)](#8-pmo-projects-pmo-prj)
9. [PMO Tasks (PMO-TSK)](#9-pmo-tasks-pmo-tsk)
10. [PMO Meetings (PMO-MTG)](#10-pmo-meetings-pmo-mtg)
11. [Leads Management (LEAD)](#11-leads-management-lead)
12. [Bug Tracking (BUG)](#12-bug-tracking-bug)
13. [Finance Module (FIN)](#13-finance-module-fin)
14. [AI Tools - Phase 1 (AI1)](#14-ai-tools---phase-1-ai1)
15. [AI Tools - Phase 2 (AI2)](#15-ai-tools---phase-2-ai2)
16. [AI Tools - Phase 3 (AI3)](#16-ai-tools---phase-3-ai3)
17. [Operations Dashboard (OPS)](#17-operations-dashboard-ops)
18. [Admin Module (ADM)](#18-admin-module-adm)
19. [Infrastructure & Compliance (INF)](#19-infrastructure--compliance-inf)
20. [API Health (API)](#20-api-health-api)
21. [Accessibility Testing (A11Y)](#21-accessibility-testing-a11y)
22. [Responsive Design (RESP)](#22-responsive-design-resp)
23. [Performance Testing (PERF)](#23-performance-testing-perf)
24. [Dark Mode Testing (DM)](#24-dark-mode-testing-dm)
25. [Visual Consistency (VIS)](#25-visual-consistency-vis)
26. [Color Accuracy (CLR)](#26-color-accuracy-clr)
27. [Button & Interactive Elements (BTN)](#27-button--interactive-elements-btn)

### Part C: Tenant Isolation Testing (NEW in v6.0)
28. [**Tenant Isolation Overview (TI)**](#28-tenant-isolation-overview-ti)
29. [**TI - Authentication Tenant Binding (TI-AUTH)**](#29-ti---authentication-tenant-binding-ti-auth)
30. [**TI - CRM Isolation (TI-CRM)**](#30-ti---crm-isolation-ti-crm)
31. [**TI - PMO Isolation (TI-PMO)**](#31-ti---pmo-isolation-ti-pmo)
32. [**TI - Finance Isolation (TI-FIN)**](#32-ti---finance-isolation-ti-fin)
33. [**TI - Leads Isolation (TI-LEAD)**](#33-ti---leads-isolation-ti-lead)
34. [**TI - Bug Tracking Isolation (TI-BUG)**](#34-ti---bug-tracking-isolation-ti-bug)
35. [**TI - AI Tools Isolation (TI-AI)**](#35-ti---ai-tools-isolation-ti-ai)
36. [**TI - API Direct Access Testing (TI-API)**](#36-ti---api-direct-access-testing-ti-api)
37. [**TI - Admin Boundary Enforcement (TI-ADM)**](#37-ti---admin-boundary-enforcement-ti-adm)
38. [**TI - Cross-Tenant Data Leakage Tests (TI-LEAK)**](#38-ti---cross-tenant-data-leakage-tests-ti-leak)

### Part D: Summary & Sign-Off
39. [Test Results Summary](#39-test-results-summary)
40. [Issue Log](#40-issue-log)
41. [Sign-Off](#41-sign-off)

---

## 1. Pre-Test Setup

### 1.1 Test Credentials - Default Tenant (Verdant Horizon Solutions)

| Role | Email | Password | Tenant | Use For |
|------|-------|----------|--------|---------|
| Admin | admin@pmo.test | AdminDemo123! | default | Admin features, full access |
| Consultant | avery.chen@pmo.test | PmoDemo123! | default | Consultant workflow |
| Consultant | priya.desai@pmo.test | PmoDemo123! | default | Multi-user testing |
| Consultant | marco.silva@pmo.test | PmoDemo123! | default | Multi-user testing |

### 1.2 Pre-Test Checklist

Before starting UAT testing, verify:
- [ ] Database has been seeded with multi-tenant test data (`npm run db:seed:uat`)
- [ ] Application is running and accessible
- [ ] Clear browser cache/use incognito mode
- [ ] Note any existing issues before testing
- [ ] API health check (`/api/healthz`) returns 200
- [ ] Dark mode toggle is accessible
- [ ] Screen resolution set to 1920x1080 for baseline
- [ ] **All three tenants seeded and accessible** (NEW in v6.0)
- [ ] **Tenant-specific URLs configured if using subdomains** (NEW in v6.0)

### 1.3 Environment Verification

| Check | Status | Notes |
|-------|--------|-------|
| Application URL accessible | [ ] Pass [ ] Fail | |
| API health check returns 200 | [ ] Pass [ ] Fail | |
| Database connectivity verified | [ ] Pass [ ] Fail | |
| All required modules enabled | [ ] Pass [ ] Fail | |
| Dark mode toggle functional | [ ] Pass [ ] Fail | |
| **Tenant 1 (default) data present** | [ ] Pass [ ] Fail | |
| **Tenant 2 (acme-corp) data present** | [ ] Pass [ ] Fail | |
| **Tenant 3 (global-tech) data present** | [ ] Pass [ ] Fail | |

---

## 2. Multi-Tenant Environment Setup

### 2.1 Tenant Configuration Overview

V6.0 testing requires **three distinct tenants** with deliberately overlapping data to test isolation:

| Tenant Slug | Tenant Name | Plan | Purpose |
|-------------|-------------|------|---------|
| `default` | Verdant Horizon Solutions | PROFESSIONAL | Primary testing tenant |
| `acme-corp` | Acme Corporation | PROFESSIONAL | Secondary tenant with overlapping names |
| `global-tech` | Global Technologies | STARTER | Third tenant for isolation edge cases |

### 2.2 Test Users Per Tenant

**Tenant 1: Verdant Horizon Solutions (slug: `default`)**
| Role | Email | Password |
|------|-------|----------|
| Owner/Admin | admin@pmo.test | AdminDemo123! |
| Member | avery.chen@pmo.test | PmoDemo123! |
| Member | priya.desai@pmo.test | PmoDemo123! |
| Member | marco.silva@pmo.test | PmoDemo123! |

**Tenant 2: Acme Corporation (slug: `acme-corp`)**
| Role | Email | Password |
|------|-------|----------|
| Owner | acme.admin@pmo.test | AcmeDemo123! |
| Member | acme.user1@pmo.test | AcmeDemo123! |
| Member | acme.user2@pmo.test | AcmeDemo123! |

**Tenant 3: Global Technologies (slug: `global-tech`)**
| Role | Email | Password |
|------|-------|----------|
| Owner | global.admin@pmo.test | GlobalDemo123! |
| Member | global.user1@pmo.test | GlobalDemo123! |

### 2.3 Deliberately Overlapping Test Data

The following entities have **identical or similar names across tenants** to test isolation:

| Entity Type | Name | Tenant 1 | Tenant 2 | Tenant 3 |
|-------------|------|----------|----------|----------|
| Account | "Acme Manufacturing" | Yes (ID varies) | Yes (ID varies) | No |
| Account | "TechForward Inc" | Yes | Yes | Yes |
| Contact | "John Smith" | Yes | Yes | Yes |
| Opportunity | "Enterprise Deal Q1" | Yes | Yes | No |
| Project | "Digital Transformation" | Yes | Yes | Yes |
| Task | "Kick-off Meeting" | Yes (in each project) | Yes | Yes |
| Lead | "Sarah Johnson" | Yes | Yes | No |
| Expense | "Office Supplies" | Yes | Yes | Yes |
| Budget | "Q1 Marketing" | Yes | Yes | No |

### 2.4 Seeding Multi-Tenant Test Data

Run the enhanced seed script to create multi-tenant test data:

```bash
cd pmo
npm run db:seed:uat
```

Verify seed completion:
```bash
# Check tenant count
npx prisma studio
# Should see 3 tenants with complete data
```

### 2.5 Tenant Access Methods

Testing can be performed via:

1. **Subdomain Access** (if configured):
   - `default.yourcrm.com` - Tenant 1
   - `acme-corp.yourcrm.com` - Tenant 2
   - `global-tech.yourcrm.com` - Tenant 3

2. **Header-Based Access** (API testing):
   - Set `X-Tenant-ID` header with tenant ID
   - Requires valid user JWT token

3. **User-Based Access** (default):
   - Login determines tenant from TenantUser association
   - System selects user's primary tenant

---

## 3. Authentication (AUTH)

> **Note:** All v5.0 AUTH tests apply. Add the following tenant-specific tests:

### AUTH-001: Admin Login
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to application URL | Login page displays |
| 2 | Enter admin@pmo.test / AdminDemo123! | Credentials accepted |
| 3 | Click Login | Redirects to dashboard |
| 4 | Check sidebar navigation | All menu items visible |
| 5 | **Verify tenant context** | Shows "Verdant Horizon Solutions" or default tenant indicator |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AUTH-002: Consultant Login
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log out if logged in | Returns to login page |
| 2 | Enter avery.chen@pmo.test / PmoDemo123! | Credentials accepted |
| 3 | Click Login | Redirects to dashboard |
| 4 | Check sidebar navigation | Appropriate menu items visible |
| 5 | **Verify tenant context** | Same tenant as admin |

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
| 4 | **Verify same tenant** | Tenant context preserved |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AUTH-005: Logout
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click logout button/menu | Logs out successfully |
| 2 | Try to access protected route | Redirects to login |
| 3 | **Verify tenant cleared** | No tenant data in session |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AUTH-006: Tenant 2 Login (NEW v6.0)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to application URL | Login page displays |
| 2 | Enter acme.admin@pmo.test / AcmeDemo123! | Credentials accepted |
| 3 | Click Login | Redirects to dashboard |
| 4 | **Verify tenant is "Acme Corporation"** | Tenant indicator shows correctly |
| 5 | **Verify cannot see Tenant 1 data** | Different accounts/projects shown |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### AUTH-007: Tenant 3 Login (NEW v6.0)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to application URL | Login page displays |
| 2 | Enter global.admin@pmo.test / GlobalDemo123! | Credentials accepted |
| 3 | Click Login | Redirects to dashboard |
| 4 | **Verify tenant is "Global Technologies"** | Tenant indicator shows correctly |
| 5 | **Verify different data set** | Tenant 3 specific data only |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 4. Navigation (NAV)

> **Note:** All v5.0 NAV tests apply. Navigation remains consistent across tenants.

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

---

## 5. CRM Accounts (CRM-ACC)

> **Note:** All v5.0 CRM-ACC tests apply. Verify tenant isolation on each test.

### CRM-ACC-001: View Accounts List
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test (Tenant 1) | Login successful |
| 2 | Navigate to CRM > Accounts | Accounts list displays |
| 3 | Verify seeded accounts appear | Should see: Acme Manufacturing, Brightside Health Group, TechForward Inc, GreenEnergy Solutions, Velocity Logistics |
| 4 | Check columns display | Name, Type, Industry, Owner, Health Score visible |
| 5 | **Verify no Tenant 2/3 accounts** | Only Tenant 1 accounts shown |

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

---

## 6. CRM Opportunities (CRM-OPP)

> **Note:** All v5.0 CRM-OPP tests apply.

### CRM-OPP-001: View Opportunities Pipeline
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to CRM > Opportunities | Pipeline/Kanban view loads |
| 2 | Verify pipeline stages display | Lead, Discovery, Proposal, Negotiation, Closed Won, Closed Lost |
| 3 | Check seeded opportunities appear | Multiple opportunities visible in stages |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-OPP-002: Create New Opportunity
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

### CRM-OPP-003: Move Opportunity Stage (Drag & Drop)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On pipeline view, find opportunity | Opportunity visible |
| 2 | Drag to different stage | Card moves |
| 3 | Release | Stage updated |
| 4 | Refresh page | Change persisted |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 7. CRM Contacts (CRM-CON)

> **Note:** All v5.0 CRM-CON tests apply.

### CRM-CON-001: View Contacts List
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to CRM > Contacts | Contacts list displays |
| 2 | Verify seeded contacts | Dana Patel, Sarah Kim, etc. visible |
| 3 | Check contact details display | Name, email, phone, title, account |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-CON-002: Create Contact
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Contact" button | Navigate to new contact form |
| 2 | Enter First Name = "UAT" | Field accepts input |
| 3 | Enter Last Name = "Tester" | Field accepts input |
| 4 | Enter Email = "uat.tester@test.example.com" | Field accepts input |
| 5 | Select Account from dropdown | Account selected |
| 6 | Click Save | Contact created |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 8. PMO Projects (PMO-PRJ)

> **Note:** All v5.0 PMO-PRJ tests apply.

### PMO-PRJ-001: View Projects List
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Projects | Projects list loads |
| 2 | Verify seeded projects | AI Strategy Roadmap, Predictive Maintenance Rollout, etc. |
| 3 | Check project info displays | Name, Account, Status, Health |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### PMO-PRJ-002: Create Project
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Project" | Form/wizard opens |
| 2 | Enter Name = "UAT Test Project" | Field accepts input |
| 3 | Select Account = "Acme Manufacturing" | Dropdown works |
| 4 | Click Save | Project created |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 9. PMO Tasks (PMO-TSK)

> **Note:** All v5.0 PMO-TSK tests apply.

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
| 1 | Click "Add Task" button | Task form opens |
| 2 | Enter Title = "UAT Test Task" | Field accepts input |
| 3 | Select Project | Dropdown works |
| 4 | Click Save | Task created |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 10. PMO Meetings (PMO-MTG)

> **Note:** All v5.0 PMO-MTG tests apply.

### PMO-MTG-001: View Meetings
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project with meetings | Project detail loads |
| 2 | Find Meetings section | Meetings listed |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 11. Leads Management (LEAD)

> **Note:** All v5.0 LEAD tests apply.

### LEAD-001: View Leads List
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Leads | Leads list displays |
| 2 | Verify seeded leads | David Chen, Amanda Foster, etc. |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### LEAD-002: Create Lead
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Lead" button | Lead form opens |
| 2 | Fill in lead details | Fields accept input |
| 3 | Click Save | Lead created |
| 4 | Verify in leads list | **New lead appears** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 12. Bug Tracking (BUG)

> **Note:** All v5.0 BUG tests apply.

### BUG-001: View Issues List
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Bug Tracking > Issues | Issues list displays |
| 2 | Verify seeded issues | Sample issues visible |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 13. Finance Module (FIN)

> **Note:** All v5.0 FIN tests apply.

### FIN-001: View Finance Dashboard
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Finance | Dashboard displays |
| 2 | Verify summary widgets | Spending, budgets visible |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 14. AI Tools - Phase 1 (AI1)

> **Note:** All v5.0 AI1 tests apply.

### AI1-001: AI Chatbot Configuration
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Chatbot | Configuration page loads |
| 2 | Verify configurations are tenant-specific | Only current tenant config shown |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 15. AI Tools - Phase 2 (AI2)

> **Note:** All v5.0 AI2 tests apply.

### AI2-001: Document Analyzer
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to AI Tools > Document Analyzer | Page loads |
| 2 | Verify tenant-specific documents | Only current tenant docs shown |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 16. AI Tools - Phase 3 (AI3)

> **Note:** All v5.0 AI3 tests apply.

---

## 17. Operations Dashboard (OPS)

> **Note:** All v5.0 OPS tests apply.

### OPS-001: View Operations Dashboard
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Operations | Dashboard loads |
| 2 | Verify AI usage metrics | Tenant-specific data shown |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 18. Admin Module (ADM)

> **Note:** All v5.0 ADM tests apply.

### ADM-001: View Admin Dashboard
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Admin | Admin panel loads |
| 2 | Verify user management | Tenant users shown |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 19. Infrastructure & Compliance (INF)

> **Note:** All v5.0 INF tests apply.

---

## 20. API Health (API)

### API-001: Health Check
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call GET /api/healthz | Returns 200 OK |
| 2 | Verify response body | { "status": "ok" } |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 21. Accessibility Testing (A11Y)

> **Note:** All v5.0 A11Y tests apply.

---

## 22. Responsive Design (RESP)

> **Note:** All v5.0 RESP tests apply.

---

## 23. Performance Testing (PERF)

> **Note:** All v5.0 PERF tests apply.

---

## 24. Dark Mode Testing (DM)

> **Note:** All v5.0 DM tests apply for each tenant.

### DM-001: Dark Mode Toggle
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find dark mode toggle | Toggle visible |
| 2 | Click toggle to enable dark mode | Theme switches |
| 3 | Navigate across pages | Dark mode persists |
| 4 | **Switch tenants** | Dark mode preference maintained |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 25. Visual Consistency (VIS)

> **Note:** All v5.0 VIS tests apply.

---

## 26. Color Accuracy (CLR)

> **Note:** All v5.0 CLR tests apply.

---

## 27. Button & Interactive Elements (BTN)

> **Note:** All v5.0 BTN tests apply.

---

# Part C: Tenant Isolation Testing (NEW in v6.0)

---

## 28. Tenant Isolation Overview (TI)

### Purpose
These tests verify that data is completely isolated between tenants. No user should be able to see, modify, or access data belonging to another tenant, even if they know the entity IDs.

### Test Strategy
1. **Cross-Login Tests**: Login to different tenants and verify data separation
2. **Direct API Tests**: Attempt to access cross-tenant resources via API
3. **ID Enumeration Tests**: Try to access entities by guessing IDs from other tenants
4. **Search/Filter Tests**: Verify search results don't leak cross-tenant data
5. **Aggregate Tests**: Verify dashboards/reports only show tenant data

### Critical Test Data - Entity IDs to Record

Before running isolation tests, record the IDs of key entities in each tenant:

**Tenant 1 (Verdant Horizon Solutions) Entity IDs:**
| Entity | Name | ID |
|--------|------|-------|
| Account | Acme Manufacturing | _____ |
| Account | TechForward Inc | _____ |
| Opportunity | Enterprise Deal Q1 | _____ |
| Contact | John Smith | _____ |
| Project | Digital Transformation | _____ |
| Lead | Sarah Johnson | _____ |
| Expense | Office Supplies | _____ |
| Budget | Q1 Marketing | _____ |

**Tenant 2 (Acme Corporation) Entity IDs:**
| Entity | Name | ID |
|--------|------|-------|
| Account | Acme Manufacturing | _____ |
| Account | TechForward Inc | _____ |
| Opportunity | Enterprise Deal Q1 | _____ |
| Contact | John Smith | _____ |
| Project | Digital Transformation | _____ |
| Lead | Sarah Johnson | _____ |
| Expense | Office Supplies | _____ |
| Budget | Q1 Marketing | _____ |

**Tenant 3 (Global Technologies) Entity IDs:**
| Entity | Name | ID |
|--------|------|-------|
| Account | TechForward Inc | _____ |
| Contact | John Smith | _____ |
| Project | Digital Transformation | _____ |
| Expense | Office Supplies | _____ |

---

## 29. TI - Authentication Tenant Binding (TI-AUTH)

### TI-AUTH-001: User Cannot Access Other Tenant After Login
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test (Tenant 1) | Login successful |
| 2 | Note the tenant context | Shows "Verdant Horizon Solutions" |
| 3 | Open browser DevTools > Application > Cookies | View JWT token |
| 4 | **Verify tenant claim in token** | Token should include tenantId |
| 5 | Open new incognito window | New session |
| 6 | Login as acme.admin@pmo.test (Tenant 2) | Login successful |
| 7 | **Verify different tenant context** | Shows "Acme Corporation" |
| 8 | **Both sessions should be independent** | Different data in each window |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-AUTH-002: User Cannot Manually Switch Tenant Context
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test (Tenant 1) | Login successful |
| 2 | Open DevTools Network tab | Ready to inspect |
| 3 | Navigate to Accounts | API call made |
| 4 | Inspect request headers | Note X-Tenant-ID if present |
| 5 | **Manually modify request with different tenant ID** | Use browser extension or cURL |
| 6 | Send modified request | **Should return 403 Forbidden or 401** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-AUTH-003: User Cannot Login to Tenant They Don't Belong To
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Attempt login with admin@pmo.test credentials | User exists |
| 2 | **Try to force X-Tenant-ID header to Tenant 2** | Via API tool/cURL |
| 3 | Verify response | **Should fail - user not in that tenant** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-AUTH-004: Session Token Validation Per Tenant
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test (Tenant 1) | Get JWT token |
| 2 | Copy the JWT token | Store for test |
| 3 | Logout | Session cleared |
| 4 | Login as acme.admin@pmo.test (Tenant 2) | Different tenant |
| 5 | **Replace Tenant 2 token with Tenant 1 token** | Via DevTools |
| 6 | Refresh page | **Should redirect to login or show Tenant 1 data only** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 30. TI - CRM Isolation (TI-CRM)

### TI-CRM-001: Account List Shows Only Current Tenant
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test (Tenant 1) | Login successful |
| 2 | Navigate to CRM > Accounts | List displays |
| 3 | Count accounts shown | Record count: _____ |
| 4 | Search for "Acme Manufacturing" | Should find Tenant 1 version |
| 5 | Note the Account ID | ID: _____ |
| 6 | Logout, login as acme.admin@pmo.test (Tenant 2) | Switch tenant |
| 7 | Navigate to CRM > Accounts | List displays |
| 8 | Count accounts shown | Different count: _____ |
| 9 | Search for "Acme Manufacturing" | Should find Tenant 2 version |
| 10 | Note the Account ID | **Different ID: _____** |
| 11 | **Verify IDs are different** | Same name, different entities |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-CRM-002: Cannot Access Other Tenant's Account by ID
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test (Tenant 1) | Login successful |
| 2 | Record Tenant 2's "Acme Manufacturing" Account ID | From previous test: _____ |
| 3 | Navigate to /crm/accounts/{Tenant2_AccountID} | Direct URL access |
| 4 | **Verify result** | **404 Not Found or Access Denied** |
| 5 | Try via API: GET /api/crm/accounts/{Tenant2_AccountID} | cURL or DevTools |
| 6 | **Verify API response** | **404 or 403 error** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-CRM-003: Cannot Update Other Tenant's Account
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test (Tenant 1) | Login successful |
| 2 | Get Tenant 2's Account ID | From TI-CRM-001 |
| 3 | Send PUT /api/crm/accounts/{Tenant2_ID} with update data | Via cURL/Postman |
| 4 | **Verify response** | **403 Forbidden or 404 Not Found** |
| 5 | Login as acme.admin@pmo.test (Tenant 2) | Switch tenant |
| 6 | Verify account was NOT modified | Original data intact |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-CRM-004: Cannot Delete Other Tenant's Account
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test (Tenant 1) | Login successful |
| 2 | Get Tenant 2's Account ID | From TI-CRM-001 |
| 3 | Send DELETE /api/crm/accounts/{Tenant2_ID} | Via cURL |
| 4 | **Verify response** | **403 Forbidden or 404 Not Found** |
| 5 | Login as acme.admin@pmo.test (Tenant 2) | Switch tenant |
| 6 | **Verify account still exists** | Account not deleted |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-CRM-005: Opportunity List Isolation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test (Tenant 1) | Login successful |
| 2 | Navigate to Opportunities | Pipeline displays |
| 3 | Find "Enterprise Deal Q1" opportunity | Note ID: _____ |
| 4 | Logout, login as acme.admin@pmo.test (Tenant 2) | Switch tenant |
| 5 | Navigate to Opportunities | Pipeline displays |
| 6 | Find "Enterprise Deal Q1" opportunity | Note ID: _____ |
| 7 | **Verify different IDs** | Same name, different entities |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-CRM-006: Cannot Access Other Tenant's Opportunity by ID
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test (Tenant 1) | Login successful |
| 2 | Navigate to /crm/opportunities/{Tenant2_OppID} | Direct URL |
| 3 | **Verify result** | **404 or Access Denied** |
| 4 | Try API: GET /api/crm/opportunities/{Tenant2_OppID} | Via cURL |
| 5 | **Verify API response** | **404 or 403** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-CRM-007: Cannot Move Other Tenant's Opportunity Stage
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test (Tenant 1) | Login successful |
| 2 | Get Tenant 2's Opportunity ID | From TI-CRM-005 |
| 3 | Send POST /api/crm/opportunities/{Tenant2_ID}/stage | With new stage |
| 4 | **Verify response** | **403 or 404** |
| 5 | Login as Tenant 2, verify opportunity stage unchanged | Stage intact |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-CRM-008: Contact List Isolation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 admin | Login successful |
| 2 | Navigate to Contacts | List displays |
| 3 | Find "John Smith" contact | Note ID: _____ |
| 4 | Logout, login as Tenant 2 admin | Switch tenant |
| 5 | Find "John Smith" contact | Note ID: _____ |
| 6 | **Verify different IDs** | Same name, different entities |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-CRM-009: Cannot Access Other Tenant's Contact by ID
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Try GET /api/crm/contacts/{Tenant2_ContactID} | Via API |
| 3 | **Verify response** | **404 or 403** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-CRM-010: Account Search Does Not Leak Cross-Tenant Data
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Search for "TechForward" | Common name across tenants |
| 3 | **Verify only Tenant 1's TechForward appears** | Single result |
| 4 | Login as Tenant 2 | Switch tenant |
| 5 | Search for "TechForward" | Same search |
| 6 | **Verify only Tenant 2's TechForward appears** | Different entity |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-CRM-011: Pipeline Stats Are Tenant-Isolated
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | View pipeline stats | Record total pipeline value: $_____ |
| 3 | Record opportunity count | Count: _____ |
| 4 | Login as Tenant 2 | Switch tenant |
| 5 | View pipeline stats | Record total: $_____ |
| 6 | **Verify different totals** | Tenant-specific aggregates |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-CRM-012: Account Dropdown Only Shows Current Tenant Accounts
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Create new Opportunity | Form opens |
| 3 | Open Account dropdown | Options display |
| 4 | **Verify only Tenant 1 accounts** | No Tenant 2/3 accounts |
| 5 | Count options | Record count: _____ |
| 6 | Login as Tenant 2 | Switch tenant |
| 7 | Create new Opportunity | Form opens |
| 8 | Open Account dropdown | Options display |
| 9 | **Verify different accounts listed** | Tenant 2 accounts only |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 31. TI - PMO Isolation (TI-PMO)

### TI-PMO-001: Project List Isolation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Navigate to Projects | List displays |
| 3 | Find "Digital Transformation" project | Note ID: _____ |
| 4 | Logout, login as Tenant 2 | Switch tenant |
| 5 | Navigate to Projects | List displays |
| 6 | Find "Digital Transformation" project | Note ID: _____ |
| 7 | **Verify different IDs** | Same name, different entities |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-PMO-002: Cannot Access Other Tenant's Project
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Navigate to /projects/{Tenant2_ProjectID} | Direct URL |
| 3 | **Verify result** | **404 or Access Denied** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-PMO-003: Task Kanban Shows Only Current Tenant Tasks
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Navigate to Tasks | Kanban displays |
| 3 | Find "Kick-off Meeting" task | Note ID: _____ |
| 4 | Login as Tenant 2 | Switch tenant |
| 5 | Navigate to Tasks | Kanban displays |
| 6 | Find "Kick-off Meeting" task | **Different ID: _____** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-PMO-004: Cannot Update Other Tenant's Task
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Send PUT /api/tasks/{Tenant2_TaskID} | Via API |
| 3 | **Verify response** | **403 or 404** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-PMO-005: Project Dropdown Only Shows Current Tenant Projects
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Create new Task | Form opens |
| 3 | Open Project dropdown | Options display |
| 4 | **Verify only Tenant 1 projects** | No Tenant 2/3 projects |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-PMO-006: Meeting Notes Isolation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | View a project's meetings | Meetings list |
| 3 | Record meeting IDs | ID: _____ |
| 4 | Login as Tenant 2 | Switch tenant |
| 5 | Try GET /api/meetings/{Tenant1_MeetingID} | Via API |
| 6 | **Verify response** | **403 or 404** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 32. TI - Finance Isolation (TI-FIN)

### TI-FIN-001: Expense List Isolation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Navigate to Finance > Expenses | List displays |
| 3 | Find "Office Supplies" expense | Note ID: _____ |
| 4 | Login as Tenant 2 | Switch tenant |
| 5 | Navigate to Finance > Expenses | List displays |
| 6 | Find "Office Supplies" expense | **Different ID: _____** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-FIN-002: Cannot Access Other Tenant's Expense
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Try GET /api/finance/expenses/{Tenant2_ExpenseID} | Via API |
| 3 | **Verify response** | **403 or 404** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-FIN-003: Budget List Isolation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Navigate to Budgets | List displays |
| 3 | Find "Q1 Marketing" budget | Note ID: _____ |
| 4 | Login as Tenant 2 | Switch tenant |
| 5 | Find "Q1 Marketing" budget | **Different ID: _____** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-FIN-004: Cannot Modify Other Tenant's Budget
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Send PUT /api/finance/budgets/{Tenant2_BudgetID} | Via API |
| 3 | **Verify response** | **403 or 404** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-FIN-005: Recurring Cost Isolation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Navigate to Recurring Costs | List displays |
| 3 | Record a recurring cost ID | ID: _____ |
| 4 | Login as Tenant 2 | Switch tenant |
| 5 | Try GET /api/finance/recurring-costs/{Tenant1_ID} | Via API |
| 6 | **Verify response** | **403 or 404** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-FIN-006: Finance Dashboard Aggregates Are Tenant-Isolated
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | View Finance Dashboard | Dashboard displays |
| 3 | Record total spending | Total: $_____ |
| 4 | Login as Tenant 2 | Switch tenant |
| 5 | View Finance Dashboard | Dashboard displays |
| 6 | **Verify different totals** | Tenant-specific aggregates |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 33. TI - Leads Isolation (TI-LEAD)

### TI-LEAD-001: Lead List Isolation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Navigate to Leads | List displays |
| 3 | Find "Sarah Johnson" lead | Note ID: _____ |
| 4 | Login as Tenant 2 | Switch tenant |
| 5 | Find "Sarah Johnson" lead | **Different ID: _____** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-LEAD-002: Cannot Access Other Tenant's Lead
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Try GET /api/leads/{Tenant2_LeadID} | Via API |
| 3 | **Verify response** | **403 or 404** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-LEAD-003: Cannot Convert Other Tenant's Lead
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Try POST /api/leads/{Tenant2_LeadID}/convert | Via API |
| 3 | **Verify response** | **403 or 404** |
| 4 | Login as Tenant 2 | Switch tenant |
| 5 | **Verify lead still exists unconverted** | Lead intact |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 34. TI - Bug Tracking Isolation (TI-BUG)

### TI-BUG-001: Issue List Isolation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Navigate to Issues | List displays |
| 3 | Record an issue ID | ID: _____ |
| 4 | Login as Tenant 2 | Switch tenant |
| 5 | Navigate to Issues | List displays |
| 6 | **Verify different issues** | Tenant-specific list |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-BUG-002: Cannot Access Other Tenant's Issue
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Try GET /api/bug-tracking/issues/{Tenant2_IssueID} | Via API |
| 3 | **Verify response** | **403 or 404** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-BUG-003: Issue Labels Are Tenant-Isolated
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | View issue labels | Labels list |
| 3 | Create custom label "UAT-Label-T1" | Label created |
| 4 | Login as Tenant 2 | Switch tenant |
| 5 | View issue labels | Labels list |
| 6 | **Verify "UAT-Label-T1" not visible** | Tenant-specific labels |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 35. TI - AI Tools Isolation (TI-AI)

### TI-AI-001: Chatbot Config Isolation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Navigate to AI Tools > Chatbot | Config page loads |
| 3 | Note chatbot settings | Widget color, name, etc. |
| 4 | Login as Tenant 2 | Switch tenant |
| 5 | Navigate to AI Tools > Chatbot | Config page loads |
| 6 | **Verify different configuration** | Tenant-specific config |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-AI-002: Document Analyzer Documents Isolation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | View analyzed documents | List displays |
| 3 | Record document IDs | ID: _____ |
| 4 | Login as Tenant 2 | Switch tenant |
| 5 | Try GET /api/document-analyzer/documents/{Tenant1_DocID} | Via API |
| 6 | **Verify response** | **403 or 404** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-AI-003: AI Usage Metrics Are Tenant-Isolated
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | View AI Usage page | Metrics display |
| 3 | Record usage statistics | Total calls: _____ |
| 4 | Login as Tenant 2 | Switch tenant |
| 5 | View AI Usage page | Metrics display |
| 6 | **Verify different statistics** | Tenant-specific usage |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 36. TI - API Direct Access Testing (TI-API)

### TI-API-001: Enumerate Account IDs
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Get auth token |
| 2 | Get valid Account ID from Tenant 1 | e.g., ID = 5 |
| 3 | Try IDs 1-20 via GET /api/crm/accounts/{id} | Loop through |
| 4 | **Record responses** | Only Tenant 1 IDs should return data |
| 5 | **Verify no Tenant 2/3 data returned** | All others should be 404 |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-API-002: Bulk Fetch Does Not Leak Data
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Get auth token |
| 2 | Call GET /api/crm/accounts?limit=1000 | Large fetch |
| 3 | **Verify count matches Tenant 1 only** | No extra records |
| 4 | Verify all returned tenantIds match | All same tenant |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-API-003: Cannot Create Entity in Other Tenant
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Get auth token |
| 2 | Get Tenant 2's tenantId | From seed data |
| 3 | POST /api/crm/accounts with Tenant 2's tenantId in body | Try to inject |
| 4 | **Verify response** | **Should create in Tenant 1 or reject** |
| 5 | If created, verify it's in Tenant 1 | tenantId should be overwritten |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-API-004: X-Tenant-ID Header Injection
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 user | Get auth token |
| 2 | Add X-Tenant-ID header with Tenant 2's ID | Via cURL |
| 3 | GET /api/crm/accounts | With header |
| 4 | **Verify response** | **Should still return Tenant 1 data or 403** |
| 5 | **User should NOT see Tenant 2 data** | Header should be ignored/validated |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-API-005: Cross-Tenant Relation Creation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Get auth token |
| 2 | Get Tenant 2's Account ID | From TI-CRM-001 |
| 3 | POST /api/crm/contacts with accountId = Tenant2_AccountID | Try to link |
| 4 | **Verify response** | **Should reject - account not found** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-API-006: Pipeline Stages Cannot Cross Tenants
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Get auth token |
| 2 | Get Tenant 2's Pipeline Stage ID | From seed data |
| 3 | POST /api/crm/opportunities with Tenant 2's stageId | Try to use |
| 4 | **Verify response** | **Should reject - stage not found** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 37. TI - Admin Boundary Enforcement (TI-ADM)

### TI-ADM-001: Tenant Admin Cannot See Other Tenants
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test (Tenant 1 Admin) | Login successful |
| 2 | Navigate to Admin panel | Admin page loads |
| 3 | Check for tenant list/selector | If visible, proceed |
| 4 | **Verify cannot see Tenant 2 or 3** | Only own tenant visible |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-ADM-002: Cannot Manage Other Tenant's Users
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test (Tenant 1) | Login successful |
| 2 | Get a Tenant 2 user's ID | From seed data |
| 3 | Try PUT /api/tenants/current/users/{Tenant2_UserID} | Via API |
| 4 | **Verify response** | **403 or 404 - user not in tenant** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-ADM-003: Cannot Invite User to Other Tenant
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test (Tenant 1) | Login successful |
| 2 | Try POST /api/tenants/{Tenant2_ID}/users | Invite to other tenant |
| 3 | **Verify response** | **403 Forbidden** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-ADM-004: Super Admin Can See All Tenants (If Applicable)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Super Admin (if exists) | Login successful |
| 2 | Navigate to platform admin | Admin page loads |
| 3 | **Verify can see all tenants** | All 3 tenants visible |
| 4 | **Verify can access tenant data in admin context** | For support purposes |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 38. TI - Cross-Tenant Data Leakage Tests (TI-LEAK)

### TI-LEAK-001: Dashboard Metrics Are Tenant-Isolated
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | View Dashboard | Dashboard loads |
| 3 | Record all metrics | Accounts: ___, Opportunities: ___, etc. |
| 4 | Login as Tenant 2 | Switch tenant |
| 5 | View Dashboard | Dashboard loads |
| 6 | **Verify different metrics** | Tenant-specific counts |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-LEAK-002: Global Search Does Not Leak Data
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Use global search for "TechForward" | Search common name |
| 3 | **Verify only Tenant 1 results** | Single account/contact |
| 4 | Login as Tenant 2 | Switch tenant |
| 5 | Use global search for "TechForward" | Same search |
| 6 | **Verify only Tenant 2 results** | Different entities |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-LEAK-003: Export Does Not Include Other Tenant Data
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Export Accounts to CSV (if feature exists) | Export file |
| 3 | **Verify only Tenant 1 accounts** | No Tenant 2/3 data |
| 4 | Count exported rows | Should match UI count |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-LEAK-004: Activity Timeline Does Not Leak
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | View Account's activity timeline | Timeline displays |
| 3 | **Verify no activities from other tenants** | All activities are Tenant 1 |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-LEAK-005: Audit Logs Are Tenant-Isolated
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | View Audit Logs (if feature exists) | Logs display |
| 3 | **Verify no logs from other tenants** | All logs are Tenant 1 actions |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-LEAK-006: Notifications Are Tenant-Isolated
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | View Notifications | Notifications display |
| 3 | **Verify no notifications from other tenants** | Tenant-specific only |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### TI-LEAK-007: User Dropdowns Only Show Tenant Users
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Create new Task | Form opens |
| 3 | Open Assignee dropdown | Users list |
| 4 | **Verify only Tenant 1 users** | No Tenant 2/3 users |
| 5 | Count users | Should match Tenant 1 user count |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## 39. Test Results Summary

### Overall Results

| Category | Total Tests | Passed | Failed | Blocked | Pass Rate |
|----------|-------------|--------|--------|---------|-----------|
| Authentication (AUTH) | 7 | | | | |
| Navigation (NAV) | 2 | | | | |
| CRM Accounts (CRM-ACC) | 7 | | | | |
| CRM Opportunities (CRM-OPP) | 3 | | | | |
| CRM Contacts (CRM-CON) | 2 | | | | |
| PMO Projects (PMO-PRJ) | 2 | | | | |
| PMO Tasks (PMO-TSK) | 2 | | | | |
| PMO Meetings (PMO-MTG) | 1 | | | | |
| Leads (LEAD) | 2 | | | | |
| Bug Tracking (BUG) | 1 | | | | |
| Finance (FIN) | 1 | | | | |
| AI Tools Phase 1 (AI1) | 1 | | | | |
| AI Tools Phase 2 (AI2) | 1 | | | | |
| Operations (OPS) | 1 | | | | |
| Admin (ADM) | 1 | | | | |
| API Health (API) | 1 | | | | |
| Dark Mode (DM) | 1 | | | | |
| **TI-AUTH** | 4 | | | | |
| **TI-CRM** | 12 | | | | |
| **TI-PMO** | 6 | | | | |
| **TI-FIN** | 6 | | | | |
| **TI-LEAD** | 3 | | | | |
| **TI-BUG** | 3 | | | | |
| **TI-AI** | 3 | | | | |
| **TI-API** | 6 | | | | |
| **TI-ADM** | 4 | | | | |
| **TI-LEAK** | 7 | | | | |
| **TOTAL** | **~90** | | | | |

### Tenant Isolation Summary

| Test Area | Critical Issues | Status |
|-----------|-----------------|--------|
| CRM Data Isolation | | [ ] Pass [ ] Fail |
| PMO Data Isolation | | [ ] Pass [ ] Fail |
| Finance Data Isolation | | [ ] Pass [ ] Fail |
| API Boundary Enforcement | | [ ] Pass [ ] Fail |
| Admin Boundary Enforcement | | [ ] Pass [ ] Fail |
| Search/Export Isolation | | [ ] Pass [ ] Fail |
| **Overall Tenant Isolation** | | **[ ] SECURE [ ] VULNERABLE** |

---

## 40. Issue Log

### Critical Issues (Tenant Isolation Failures)

| Issue ID | Test ID | Description | Severity | Status |
|----------|---------|-------------|----------|--------|
| | | | | |

### High Priority Issues

| Issue ID | Test ID | Description | Severity | Status |
|----------|---------|-------------|----------|--------|
| | | | | |

### Medium Priority Issues

| Issue ID | Test ID | Description | Severity | Status |
|----------|---------|-------------|----------|--------|
| | | | | |

### Low Priority Issues

| Issue ID | Test ID | Description | Severity | Status |
|----------|---------|-------------|----------|--------|
| | | | | |

---

## 41. Sign-Off

### Testing Completion

| Section | Tester | Date | Status |
|---------|--------|------|--------|
| Core Functionality (AUTH-BTN) | | | |
| Tenant Isolation (TI-*) | | | |
| Full Regression | | | |

### Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | | | |
| Development Lead | | | |
| Security Lead | | | |
| Product Owner | | | |

### Certification Statement

**I certify that:**
- [ ] All tests in this document have been executed
- [ ] All critical issues have been resolved or documented
- [ ] **Tenant isolation is verified and data is properly segregated**
- [ ] The application is ready for production deployment

---

## Appendix A: API Testing Commands

### Authentication
```bash
# Login as Tenant 1 Admin
curl -X POST https://verdanthorizon.ai/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pmo.test","password":"AdminDemo123!"}' \
  -c cookies.txt

# Login as Tenant 2 Admin
curl -X POST https://verdanthorizon.ai/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"acme.admin@pmo.test","password":"AcmeDemo123!"}' \
  -c cookies-t2.txt
```

### Cross-Tenant Access Tests
```bash
# Try to access Tenant 2 account from Tenant 1 session
curl -X GET https://verdanthorizon.ai/api/crm/accounts/{TENANT2_ACCOUNT_ID} \
  -b cookies.txt

# Try to update Tenant 2 account from Tenant 1 session
curl -X PUT https://verdanthorizon.ai/api/crm/accounts/{TENANT2_ACCOUNT_ID} \
  -H "Content-Type: application/json" \
  -d '{"name":"Hacked Account"}' \
  -b cookies.txt

# Try header injection
curl -X GET https://verdanthorizon.ai/api/crm/accounts \
  -H "X-Tenant-ID: {TENANT2_ID}" \
  -b cookies.txt
```

---

## Appendix B: Entity ID Reference

Use this section to record entity IDs discovered during testing:

### Tenant 1 (Verdant Horizon Solutions) IDs
```
Tenant ID: _____
Account IDs: _____
Opportunity IDs: _____
Contact IDs: _____
Project IDs: _____
Task IDs: _____
Lead IDs: _____
Expense IDs: _____
Budget IDs: _____
```

### Tenant 2 (Acme Corporation) IDs
```
Tenant ID: _____
Account IDs: _____
Opportunity IDs: _____
Contact IDs: _____
Project IDs: _____
Task IDs: _____
Lead IDs: _____
Expense IDs: _____
Budget IDs: _____
```

### Tenant 3 (Global Technologies) IDs
```
Tenant ID: _____
Account IDs: _____
Contact IDs: _____
Project IDs: _____
Task IDs: _____
Expense IDs: _____
```

---

**End of UAT Testing Script v6.0**
