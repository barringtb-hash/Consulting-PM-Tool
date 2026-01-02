# UAT Testing Script v3.0

**Last Updated:** January 2026
**Purpose:** Comprehensive User Acceptance Testing script for the AI CRM Platform
**Application URL:** https://pmo.elipseconsulting.ai

---

## Test Credentials

| Role | Email | Password | Use For |
|------|-------|----------|---------|
| Admin | admin@pmo.test | AdminDemo123! | Admin features, full access testing |
| Consultant | avery.chen@pmo.test | PmoDemo123! | Consultant workflow testing |
| Consultant | priya.desai@pmo.test | PmoDemo123! | Multi-user testing |
| Consultant | marco.silva@pmo.test | PmoDemo123! | Multi-user testing |

---

## Pre-Test Checklist

Before starting UAT testing, verify:
- [ ] Database has been seeded with test data (`npx prisma db seed`)
- [ ] Application is running and accessible
- [ ] Clear browser cache/use incognito mode
- [ ] Note any existing issues before testing

---

## Test Categories

1. [AUTH - Authentication](#auth---authentication)
2. [NAV - Navigation](#nav---navigation)
3. [CRM-ACC - CRM Accounts](#crm-acc---crm-accounts)
4. [CRM-OPP - CRM Opportunities](#crm-opp---crm-opportunities)
5. [CRM-CON - CRM Contacts](#crm-con---crm-contacts)
6. [PMO-PRJ - Projects](#pmo-prj---projects)
7. [PMO-TSK - Tasks](#pmo-tsk---tasks)
8. [PMO-MTG - Meetings](#pmo-mtg---meetings)
9. [LEAD - Leads Management](#lead---leads-management)
10. [BUG - Bug Tracking](#bug---bug-tracking)
11. [API - API Health](#api---api-health)

---

## AUTH - Authentication

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

---

## NAV - Navigation

### NAV-001: Sidebar Navigation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click Dashboard | Dashboard page loads |
| 2 | Click CRM > Accounts | Accounts list loads |
| 3 | Click CRM > Opportunities | Opportunities/Pipeline view loads |
| 4 | Click Projects | Projects list loads |
| 5 | Click Tasks | Tasks Kanban board loads |
| 6 | Click Leads | Leads list loads |
| 7 | Click Bug Tracking > Issues | Issues list loads |

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

---

## CRM-ACC - CRM Accounts

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

### CRM-ACC-006: Account Search/Filter
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On accounts list, search for "Acme" | Filters to matching accounts |
| 2 | Clear search, filter by Type = "Customer" | Shows only customers |
| 3 | Filter by Industry = "Healthcare" | Shows Brightside Health |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-ACC-007: Health Score Recalculation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to account detail (e.g., Acme Manufacturing) | Page loads |
| 2 | Click "Recalculate Health Score" button | Loading indicator shows |
| 3 | Wait for calculation | Score updates based on CRM data |
| 4 | Verify score is not default 50 | Score reflects actual metrics |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## CRM-OPP - CRM Opportunities

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
| 1 | Click on "Acme Predictive Maintenance Phase 2" | Detail page loads |
| 2 | Verify amount displays | $250,000 |
| 3 | Check probability | 50% |
| 4 | Verify linked account | Acme Manufacturing |
| 5 | Check owner | Avery Chen |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-OPP-003: Create New Opportunity
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Opportunity" button | Form opens |
| 2 | Fill Name = "UAT Test Opportunity" | Field accepts input |
| 3 | Select Account = "TechForward Inc" | Dropdown works |
| 4 | Enter Amount = 100000 | Number accepted |
| 5 | Select Stage = "Discovery" | Dropdown works |
| 6 | Click Save | Opportunity created |
| 7 | Verify in pipeline | Shows in Discovery column |

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

### CRM-OPP-005: Move Opportunity Stage (Button)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on opportunity to view details | Detail page loads |
| 2 | Click "Move Stage" or stage dropdown | Stage options appear |
| 3 | Select "Negotiation" | Stage updates |
| 4 | Verify probability auto-updates | Probability = 75% |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-OPP-006: Mark Opportunity Won
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On opportunity detail, click "Mark Won" | Confirmation may appear |
| 2 | Confirm | Status = Won |
| 3 | Verify stage = "Closed Won" | Pipeline reflects change |
| 4 | Check probability = 100% | Updated |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-OPP-007: Mark Opportunity Lost
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create or select an open opportunity | |
| 2 | Click "Mark Lost" | Lost reason dialog appears |
| 3 | Enter reason = "Lost to competitor" | Field accepts input |
| 4 | Confirm | Status = Lost |
| 5 | Verify stage = "Closed Lost" | Pipeline reflects change |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-OPP-008: Pipeline Statistics
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View pipeline dashboard/stats | Stats section visible |
| 2 | Check total pipeline value | Sum of all opportunity amounts |
| 3 | Check weighted pipeline | Sum of weighted amounts |
| 4 | Verify stage counts | Number of deals per stage |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## CRM-CON - CRM Contacts

### CRM-CON-001: View Contacts
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to CRM Contacts or Account detail | Contacts visible |
| 2 | Verify seeded contacts | Dana Patel, Sarah Kim, etc. visible |
| 3 | Check contact details display | Name, email, phone, title |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-CON-002: Create Contact
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Contact" on account detail | Form opens |
| 2 | Enter First Name = "UAT", Last Name = "Tester" | Fields accept input |
| 3 | Enter Email = "uat.tester@test.example.com" | Field accepts input |
| 4 | Enter Job Title = "QA Manager" | Field accepts input |
| 5 | Click Save | Contact created |
| 6 | Verify in contacts list | New contact appears |

**Status:** [ ] Pass [ ] Fail
**Notes:**

### CRM-CON-003: Edit Contact
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click edit on "UAT Tester" contact | Edit form opens |
| 2 | Change Job Title to "Senior QA Manager" | Field updates |
| 3 | Save | Changes saved |
| 4 | Verify title updated | New title displays |

**Status:** [ ] Pass [ ] Fail
**Notes:**

---

## PMO-PRJ - Projects

### PMO-PRJ-001: View Projects List
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Projects | Projects list loads |
| 2 | Verify seeded projects | AI Strategy Roadmap, Predictive Maintenance Rollout, AI Intake Modernization |
| 3 | Check project info displays | Name, Client, Status, Health |

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
| 1 | Click "New Project" | Form opens |
| 2 | Enter Name = "UAT Test Project" | Field accepts input |
| 3 | Select Client = "Acme Manufacturing" | Dropdown works |
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

---

## PMO-TSK - Tasks

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

---

## PMO-MTG - Meetings

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

---

## LEAD - Leads Management

### LEAD-001: View Leads List
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Leads | Leads list displays |
| 2 | Verify seeded leads | David Chen, Amanda Foster, James Wilson, etc. |
| 3 | Check lead info displays | Name, Email, Company, Status, Source |

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
| 8 | Verify in leads list | New lead appears |

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

---

## BUG - Bug Tracking

### BUG-001: View Issues List
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Bug Tracking > Issues | Issues list displays |
| 2 | Verify seeded issues | Dashboard charts issue, bulk export feature request, etc. |
| 3 | Check columns | Title, Type, Status, Priority, Labels |

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
| 1 | On issue detail, click Assign | Assignee dropdown opens |
| 2 | Select "Avery Chen" | User selected |
| 3 | Save | Assignment saved |
| 4 | Verify assignee displays | Avery Chen shown |

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

---

## API - API Health

### API-001: Health Check Endpoint
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Access /api/healthz directly | Returns 200 OK |
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

## Test Results Summary

| Category | Total Tests | Passed | Failed | Notes |
|----------|-------------|--------|--------|-------|
| AUTH | 5 | | | |
| NAV | 3 | | | |
| CRM-ACC | 7 | | | |
| CRM-OPP | 8 | | | |
| CRM-CON | 3 | | | |
| PMO-PRJ | 4 | | | |
| PMO-TSK | 5 | | | |
| PMO-MTG | 3 | | | |
| LEAD | 4 | | | |
| BUG | 7 | | | |
| API | 3 | | | |
| **TOTAL** | **52** | | | |

---

## Issue Log

For any failed tests, document issues here:

| Test ID | Issue Description | Severity | Screenshots/Logs |
|---------|-------------------|----------|------------------|
| | | | |

---

## Tester Information

| Field | Value |
|-------|-------|
| Tester Name | |
| Test Date | |
| Environment | |
| Browser/Device | |
| Build Version | |

---

## Notes for AI Agent Tester

When executing this UAT script:

1. **Execute tests in order** - Some tests depend on data created in previous tests
2. **Document all failures immediately** - Include console errors, network failures, and screenshots
3. **Test with different users** - Login as admin first, then consultant for role-based testing
4. **Check for console errors** - Open browser DevTools and monitor for JavaScript errors
5. **Verify data persistence** - After creating items, refresh page to confirm they persist
6. **Test edge cases**:
   - Empty form submissions
   - Very long text inputs
   - Special characters in text fields
   - Multiple rapid clicks on buttons
7. **Report any UI/UX issues** - Broken layouts, unclear error messages, slow loading
8. **Capture API errors** - Note any 4xx or 5xx responses in network tab

After completing all tests, provide:
- Total pass/fail count
- List of all failures with reproduction steps
- Any critical issues that block further testing
- Recommendations for improvements
