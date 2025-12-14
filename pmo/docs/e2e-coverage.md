# E2E Test Coverage - M0 through M7 + CRM

**Last Updated**: 2025-12-14
**Test Framework**: Playwright
**Location**: `/pmo/e2e/`

---

## Overview

This document describes the end-to-end test coverage for the AI CRM Platform, covering:
- **CRM Core**: Accounts, Opportunities, Pipeline, Activities (primary)
- **Legacy PMO**: Clients, Projects, Tasks, Meetings (M0-M7)

> **Note**: The platform has evolved from a PMO tool to a comprehensive CRM SaaS platform. New features should use CRM entities (Account, Opportunity, CRMContact, CRMActivity) instead of legacy PMO entities (Client, Contact).

## Test Execution

```bash
# From /pmo directory
npm run test:e2e          # Run all E2E tests headless
npm run test:e2e:headed   # Run with browser visible
npm run test:e2e:ui       # Run with Playwright UI
```

## Authentication Setup

**File**: `e2e/global.setup.ts`

Global authentication setup that:

- Logs in once before all tests using seeded test account (`admin@pmo.test`)
- Saves authentication state to `e2e/.auth/user.json`
- All tests inherit this authenticated state

---

## M1: Authentication & Authorization

**Test File**: `e2e/auth.spec.ts`

### Covered Flows

1. **Login with Valid Credentials**
   - Navigate to login page
   - Fill email and password
   - Submit form
   - Verify redirect to dashboard
   - Confirm user is authenticated

2. **Login with Invalid Credentials**
   - Attempt login with wrong credentials
   - Verify error message is displayed
   - Confirm user remains on login page

3. **Session Persistence**
   - Authenticate and navigate to dashboard
   - Reload page
   - Verify user remains authenticated
   - Confirm no redirect to login

4. **Logout Functionality**
   - Click logout button
   - Verify redirect to login page
   - Attempt to access protected route
   - Confirm redirect back to login

5. **Protected Route Redirects**
   - Access protected routes while unauthenticated
   - Verify automatic redirect to login
   - Test multiple protected routes: `/dashboard`, `/clients`, `/projects`, `/tasks`, `/assets`

6. **Multiple User Accounts**
   - Login as different user types (admin, consultant)
   - Verify successful authentication for each account type
   - Test with seeded accounts: `admin@pmo.test`, `avery.chen@pmo.test`

---

## M2: Clients & Contacts Management (Legacy PMO)

> **Note**: These tests cover the legacy Client/Contact entities. For new implementations, use the CRM Accounts and CRMContacts modules. See `/crm/accounts` routes.

**Test File**: `e2e/clients.spec.ts`

### Covered Flows

1. **Create New Client**
   - Navigate to clients page
   - Fill client name form
   - Submit creation
   - Verify client appears in list

2. **View Client Details Page**
   - Click on client from list
   - Verify navigation to client details
   - Confirm URL pattern `/clients/:id`
   - Verify client name is displayed

3. **Create Contact for Client**
   - Navigate to client details
   - Click "Add Contact" button
   - Fill contact name and email
   - Submit contact creation
   - Verify contact appears in list

4. **View Contacts on Client Page**
   - Open client details
   - Navigate to contacts section/tab
   - Verify contacts are displayed

5. **Display Client List**
   - Navigate to `/clients`
   - Verify clients page heading
   - Confirm created clients are visible

6. **Search/Filter Clients**
   - Use search input if available
   - Filter clients by name
   - Verify search results update

7. **Navigation Between List and Details**
   - Navigate from clients list to details
   - Return to list
   - Verify proper navigation flow

---

## M3: Projects Management

**Test File**: `e2e/projects.spec.ts`

### Covered Flows

1. **Create Project for Client**
   - Create or select a client
   - Click "New Project" button
   - Fill project name and details
   - Select client association
   - Submit project creation
   - Verify project appears and URL is `/projects/:id`

2. **View Project Details with All Tabs**
   - Open project
   - Navigate through all tabs:
     - Summary
     - Tasks
     - Milestones
     - Meetings
     - Assets
     - Status
   - Verify each tab loads content correctly

3. **Display Project Summary**
   - Open project
   - Navigate to Summary tab
   - Verify project information is displayed (name, client, dates)

4. **Create Project from Template**
   - Navigate to project creation
   - Select template option
   - Choose a template
   - Fill project details
   - Verify project is created with template structure

5. **Show Projects List for Client**
   - Open client details
   - View projects section
   - Verify client's projects are listed

6. **Navigate from Client to Project**
   - Click project from client details
   - Verify navigation to project page
   - Use back navigation to return to client

---

## M4: Tasks & Milestones

**Test File**: `e2e/tasks-milestones.spec.ts`

### Covered Flows

1. **Create Task in Project**
   - Navigate to project Tasks tab
   - Click "New Task" button
   - Fill task title and description
   - Submit task creation
   - Verify task appears in project

2. **Move Task Between Kanban Columns**
   - Find task in Tasks tab
   - Change task status (e.g., To Do → In Progress)
   - Verify task moves to new column/status

3. **View Task in Global "My Tasks"**
   - Navigate to `/tasks`
   - Verify created task appears in global view
   - Confirm task is linked to correct project

4. **Create Milestone for Project**
   - Navigate to project Milestones tab
   - Click "New Milestone" button
   - Fill milestone name, description, target date
   - Submit milestone creation
   - Verify milestone appears

5. **Mark Milestone as Reached**
   - Find milestone in list
   - Click "Mark as Reached" or similar button
   - Verify milestone status updates to complete

6. **Filter Tasks by Status**
   - Navigate to My Tasks
   - Use status filter
   - Select a status (e.g., To Do)
   - Verify tasks are filtered accordingly

7. **Edit Existing Task**
   - Open task from My Tasks
   - Click edit button
   - Update task title
   - Save changes
   - Verify update is reflected

---

## M5: Meetings

**Test File**: `e2e/meetings.spec.ts`

### Covered Flows

1. **Create Meeting for Project**
   - Navigate to project Meetings tab
   - Click "New Meeting" button
   - Fill meeting title and date
   - Add meeting notes/agenda
   - Submit meeting creation
   - Verify meeting appears in list

2. **View Meeting Details and Notes**
   - Click on meeting from list
   - Verify meeting details page opens
   - Confirm meeting title and notes are visible

3. **Create Task from Meeting Notes**
   - Open meeting details
   - Click "Create Task" button
   - Fill task details based on meeting notes
   - Submit task creation
   - Verify task appears in:
     - Project Tasks tab
     - Global My Tasks view

4. **View Meeting History for Project**
   - Navigate to project Meetings tab
   - Verify list of meetings is displayed
   - Confirm meetings are shown chronologically

5. **Edit Meeting Details**
   - Open meeting
   - Click edit button
   - Update meeting title or notes
   - Save changes
   - Verify updates are reflected

6. **Link Participants to Meeting**
   - Open meeting details
   - Verify participants/attendees section exists
   - (Implementation may vary)

7. **Display Meetings Chronologically**
   - View meetings list
   - Verify meetings are ordered by date

---

## M6: AI Assets

**Test File**: `e2e/ai-assets.spec.ts`

### Covered Flows

1. **View AI Assets Library**
   - Navigate to `/assets`
   - Verify Assets page heading
   - Confirm page loads without errors

2. **Create New AI Asset**
   - Click "New Asset" button
   - Fill asset name and description
   - Select asset type (template/client-specific)
   - Add content/prompt
   - Submit asset creation
   - Verify asset appears in library

3. **Create Client-Specific AI Asset**
   - Navigate to assets creation
   - Fill asset details
   - Select specific client
   - Mark as client-specific
   - Verify asset is created and associated with client

4. **Link Asset to Project**
   - Navigate to project Assets tab
   - Click "Link Asset" button
   - Select asset from library
   - Confirm linking
   - Verify asset appears in project's Assets tab

5. **View Linked Assets in Project**
   - Open project
   - Navigate to Assets tab
   - Verify linked assets are displayed

6. **Unlink Asset from Project**
   - Go to project Assets tab
   - Click "Unlink" button for an asset
   - Confirm action
   - Verify asset is removed from project (but still in global library)

7. **Filter Assets by Type**
   - Navigate to global Assets page
   - Use type/category filter
   - Select filter option (e.g., "Template")
   - Verify filtered results

8. **Search for Assets**
   - Use search input on Assets page
   - Type asset name
   - Verify search results update

9. **View Asset Details**
   - Click on asset from library
   - Verify asset details page opens
   - Confirm description and content are visible

10. **Edit AI Asset**
    - Open asset details
    - Click edit button
    - Update asset name or content
    - Save changes
    - Verify updates are reflected

---

## M7: Status & Reporting

**Test File**: `e2e/status-reporting.spec.ts`

### Covered Flows

1. **View Project Status Tab**
   - Navigate to project
   - Click Status tab
   - Verify status content is displayed
   - Confirm tab is active

2. **Display Project Health Indicators**
   - Open project Status tab
   - Verify RAG (Red/Amber/Green) status indicators
   - Confirm health badges are visible

3. **Display Key Project Dates**
   - View Status tab
   - Verify presence of:
     - Start date
     - Target/due date
     - Completion date
   - Confirm dates are formatted correctly

4. **Display Progress Metrics**
   - Open Status tab
   - Verify progress indicators (percentage, progress bars)
   - Confirm metrics are visible

5. **View Global Dashboard**
   - Navigate to `/dashboard`
   - Verify dashboard heading
   - Confirm dashboard content loads

6. **Display Project Tiles on Dashboard**
   - View dashboard
   - Verify project cards/tiles are displayed
   - Confirm projects are clickable

7. **Display Summary Statistics on Dashboard**
   - View dashboard
   - Look for summary metrics:
     - Total projects
     - Active projects
     - Total clients
     - Task counts
     - Overdue items
   - Verify at least some statistics are displayed

8. **Show Task Count in Project Status**
   - Create tasks in project
   - Navigate to Status tab
   - Verify task count is displayed

9. **Show Milestone Count in Project Status**
   - Create milestones in project
   - Navigate to Status tab
   - Verify milestone count is displayed

10. **Update Project Health Status**
    - Open project Status tab
    - Click "Update Status" button
    - Select new health status (Green/Amber/Red)
    - Save changes
    - Verify status is updated

11. **Navigate from Dashboard to Project Status**
    - Click project card on dashboard
    - Verify navigation to project details
    - Confirm project information is displayed

---

## Happy Path Test

**Test File**: `e2e/happy-path.spec.ts`

### Complete Workflow

**Test**: "Complete workflow: client → project → meeting → task"

This test covers the primary user journey:

1. Start at dashboard (authenticated)
2. Navigate to Clients page
3. Create new client
4. View client details
5. Create project for client
6. View project details
7. Add meeting to project
8. Create task from meeting notes
9. Navigate to global My Tasks view
10. Verify task appears in global view

**Test**: "Can logout and login again"

1. Logout from dashboard
2. Verify redirect to login
3. Login again with same credentials
4. Verify successful re-authentication
5. Confirm redirect to dashboard

---

## Coverage Summary

### By Module

| Module       | Test File                  | Tests | Key Flows Covered                            |
| ------------ | -------------------------- | ----- | -------------------------------------------- |
| M1: Auth     | `auth.spec.ts`             | 6     | Login, logout, session, protected routes     |
| M2: Clients (Legacy) | `clients.spec.ts`   | 7     | Create client, contacts, list, details (use Account instead) |
| M3: Projects | `projects.spec.ts`         | 6     | Create project, tabs, summary, templates     |
| M4: Tasks    | `tasks-milestones.spec.ts` | 7     | Create task, kanban, milestones, global view |
| M5: Meetings | `meetings.spec.ts`         | 8     | Create meeting, notes, task creation         |
| M6: Assets   | `ai-assets.spec.ts`        | 10    | Create asset, link/unlink, filter, search    |
| M7: Status   | `status-reporting.spec.ts` | 11    | Status tab, health, dashboard, metrics       |
| Happy Path   | `happy-path.spec.ts`       | 2     | End-to-end workflows                         |

**Total Tests**: ~57 individual test cases

### CRM Module Coverage (Recommended Additions)

| Module            | Suggested Test File        | Priority | Key Flows                                     |
| ----------------- | -------------------------- | -------- | --------------------------------------------- |
| CRM: Accounts     | `crm-accounts.spec.ts`     | High     | CRUD, hierarchy, health, merge, timeline      |
| CRM: Opportunities| `crm-opportunities.spec.ts`| High     | Pipeline stages, won/lost, forecasting        |
| CRM: Activities   | `crm-activities.spec.ts`   | Medium   | Log calls/emails, timeline, complete/cancel   |
| Lead Conversion   | `lead-conversion.spec.ts`  | Medium   | Convert to Account + Opportunity              |
| AI Tools Config   | `ai-tools.spec.ts`         | Low      | Chatbot/Doc Analyzer configuration            |

---

## Test Data Strategy

### Seeded Test Accounts

From `pmo/prisma/seed.ts`:

- **Admin**: `admin@pmo.test` / `AdminDemo123!`
- **Consultants**:
  - `avery.chen@pmo.test` / `PmoDemo123!`
  - `priya.desai@pmo.test` / `PmoDemo123!`
  - `marco.silva@pmo.test` / `PmoDemo123!`

### Dynamic Test Data

Tests create unique data using timestamps to avoid conflicts:

- Client names: `E2E Client ${Date.now()}`
- Project names: `E2E Project ${Date.now()}`
- Task titles: `E2E Task ${Date.now()}`

This ensures tests can run repeatedly without cleanup.

---

## Running Tests

### Local Development

```bash
# Start API and web servers (in separate terminals)
cd pmo
npm run dev --workspace pmo-api
npm run dev --workspace pmo-web

# Run E2E tests
npm run test:e2e
```

### CI/CD

E2E tests run in CI via Playwright's `webServer` configuration, which automatically:

1. Starts the API server on `localhost:4000`
2. Starts the web server on `localhost:5173`
3. Waits for health checks to pass
4. Runs all E2E tests
5. Shuts down servers after tests complete

---

## Known Test Patterns

### Flexible Element Selection

Tests use multiple strategies to find elements:

- Role-based selectors (preferred): `getByRole('button', { name: /create/i })`
- Label-based selectors: `getByLabel(/name/i)`
- Text content: `getByText('Client Name')`
- Fallback with visibility checks: `isVisible({ timeout: 2000 }).catch(() => false)`

### Graceful Degradation

Many tests check if elements exist before interacting:

```typescript
if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
  await button.click();
  // ... test continues
}
```

This allows tests to pass even if UI varies slightly between implementations.

---

## CRM E2E Tests (Recommended)

Future E2E tests should cover the CRM modules:

### CRM: Accounts
- Create Account with hierarchy (parent/child)
- View Account details and timeline
- Update health score and engagement
- Archive and restore Account
- Merge duplicate Accounts

### CRM: Opportunities
- Create Opportunity linked to Account
- Move Opportunity through pipeline stages
- Mark as Won/Lost with reason
- View pipeline statistics
- Stage history tracking

### CRM: Activities
- Log calls, emails, meetings
- View unified timeline
- Complete/cancel activities
- Filter by type and status

### CRM: Lead Conversion
- Convert InboundLead to Account + Opportunity
- Verify pipeline creation
- Test conversion with/without Project

---

## Future Enhancements

### Additional Coverage Needed

1. **CRM Coverage**: Comprehensive CRM E2E tests for Accounts, Opportunities, Activities
2. **Error Handling**: Test error states and validation messages
3. **Edge Cases**: Empty states, maximum limits, special characters
4. **Performance**: Measure page load times, API response times
5. **Accessibility**: Add a11y assertions to all tests
6. **Mobile**: Test responsive layouts
7. **Concurrent Users**: Multi-user scenarios
8. **Data Persistence**: Verify data survives page reloads
9. **AI Tools**: E2E tests for Chatbot, Document Analyzer configuration

### Test Organization

Consider creating:

- Page Object Models (POMs) for common UI patterns
- Test fixtures for reusable data setup
- Custom Playwright fixtures for authentication
- Utility functions for common assertions

---

## Maintenance

### When to Update Tests

- **New Features**: Add test coverage for new modules
- **UI Changes**: Update selectors if element attributes change
- **API Changes**: Adjust assertions if response formats change
- **Bug Fixes**: Add regression tests

### Test Stability

To maintain stable tests:

1. Use data-testid attributes for critical UI elements
2. Avoid hard-coded waits (use Playwright's auto-waiting)
3. Make tests independent (no shared state between tests)
4. Clean up test data (or use unique identifiers)

---

## Related Documentation

- [M8 Hardening Notes](./m8-hardening-notes.md) - Overall M8 implementation plan
- [Playwright Config](../playwright.config.ts) - Test configuration
- [CI Workflow](../../.github/workflows/ci.yml) - CI/CD pipeline

---

**Document maintained by**: Development team
**Questions?**: Check Playwright docs at https://playwright.dev
