# AI Consulting PMO Platform – Product Requirements & Technical Spec (MVP)

> **Note**: This document describes the original PMO (Project Management Office) features. The platform has since been transformed into a comprehensive **AI CRM Platform** with full CRM capabilities including Accounts, Opportunities, Pipelines, and Activities. See [CRM-TRANSFORMATION-PLAN.md](CRM-TRANSFORMATION-PLAN.md) for the CRM architecture and features.

## 1. Document Info

- **Product Name (Current):** AI CRM Platform (evolved from AI Consulting PMO Platform)
- **Owner:** [Your Name]
- **Version:** 2.0 (CRM + PMO)
- **Last Updated:** 2025-12-11

---

## 2. Product Overview

### 2.1 Vision

Build a lightweight, opinionated project management and PMO system designed specifically for a **solo AI consultant** supporting **small–medium businesses** with:

- AI discovery & roadmapping
- PoCs and implementations
- Training & workshops
- Retainer-based ongoing support

The platform becomes the central operating system for:

- Clients and contacts
- Projects and phases
- Tasks, milestones, meetings, and decisions
- AI assets (prompts, workflows, integrations)
- Retainers and recurring work
- Status and reporting

### 2.2 Primary Use Cases

1. **Spin up a new client engagement** using a standardized project template.
2. **Track tasks and milestones** across multiple projects while staying sane.
3. **Record meetings and decisions** and convert notes into actionable tasks.
4. **Catalog AI assets** (prompts, workflows, integrations) per client and reuse them.
5. **Generate status updates** for clients quickly based on project data.
6. **Manage retainers** and ongoing engagements at a high level.

---

## 3. Personas

### 3.1 Primary Persona – AI Consultant / PMO (You)

- Solo consultant (initially)
- Acts as:
  - Sales / pre-sales
  - Project manager
  - Solution architect
  - Delivery lead
- Needs:
  - Central view of all clients & projects
  - Reusable project templates
  - Clean tracking of tasks, decisions, and assets
  - Fast status reporting

### 3.2 Secondary Persona – Client Sponsor (Read-Only, Future)

- SMB owner / VP / Director
- Needs:
  - Clear project scope and progress
  - Visibility into upcoming milestones
  - Confidence that work is structured and under control

### 3.3 Future Persona – Collaborators / Subcontractors

- Limited access to:
  - Assigned tasks
  - Relevant project context
  - Specific AI assets

---

## 4. Objectives & Success Metrics

### 4.1 Objectives

1. **Standardize delivery** across all AI consulting engagements using templates.
2. **Reduce admin overhead** (tracking tasks, decisions, and status).
3. **Increase reuse** of AI assets across clients.
4. **Improve client communication** with consistent, quick status updates.

### 4.2 Success Metrics (Internal)

- Time to create a new project from template: **< 15 minutes**
- Time to generate a weekly status summary per project: **< 10 minutes**
- Number of “lost context” incidents (where is that prompt/doc?): **< 1 per project/month**
- > 80% of AI assets tagged and reusable across projects

---

## 5. Scope & Phasing

### 5.1 MVP Scope (Phase 1)

**In Scope:**

- Client & project management
- Project templates (AI consulting specific)
- Task management (list + simple kanban)
- Milestones (basic)
- Meeting notes + action item creation
- AI asset catalog (prompts, workflows, integrations)
- Project-level status snapshot
- Basic authentication (single user)

### 5.2 Phase 2 (Post-MVP)

- Retainer management
- Status report generation helpers
- Simple role-based access for future collaborators
- Basic time/budget tracking

### 5.3 Phase 3+ (Nice-to-Have / Future)

- Client portal (read-only status)
- Integrations: Calendar, Email, Slack/Teams
- Embedded AI assistant:
  - Summarize meetings
  - Suggest risks / next steps
  - Draft status updates

---

## 6. Functional Requirements (MVP)

Functional Requirements are labeled **FR-X.Y**.

### 6.1 Client Management

**FR-1.1 – Create & Manage Clients (MUST)**  
- User can create, read, update, and archive Client records.
- Client fields:
  - `name` (string, required)
  - `industry` (string, optional)
  - `company_size` (enum: Micro/Small/Medium, optional)
  - `timezone` (string, optional)
  - `ai_maturity` (enum: None / Low / Medium / High, optional)
  - `notes` (text, optional)
  - `created_at`, `updated_at` (timestamps)

**FR-1.2 – Client Contacts (SHOULD)**  
- Each Client can have multiple Contacts.
- Contact fields:
  - `name`, `email`, `role`, `phone`, `notes`
- Contacts displayed on the Client detail page.

**FR-1.3 – Client Overview Page (MUST)**  
- For each Client, show:
  - Basic client info
  - List of active projects
  - Key contacts
  - Recent meetings (from any project)
  - Links to AI assets used for this client

---

### 6.2 Project Management

**FR-2.1 – Create & Manage Projects (MUST)**  
- User can create, read, update, and archive Projects.
- Project fields:
  - `name` (string, required)
  - `client_id` (required)
  - `type` (enum: Discovery / PoC / Implementation / Training / Retainer / Mixed)
  - `status` (enum: Pipeline / Active / On Hold / Completed / Canceled)
  - `start_date`, `target_end_date`
  - `goals` (text)
  - `description` (text)
  - `budget_type` (enum: Fixed / T&M / Retainer / Hybrid)
  - `tags` (string array)
  - `created_at`, `updated_at`

**FR-2.2 – Project Templates (MUST)**  
- System ships with predefined templates, e.g.:
  - AI Discovery & Roadmap
  - PoC / Pilot
  - Implementation / Rollout
  - Training / Workshop
- Each template defines:
  - Suggested milestones
  - Initial task lists
- On project creation, user can:
  - Choose a template OR
  - Start from scratch
- Template application:
  - Auto-create milestones and tasks linked to the new project.

**FR-2.3 – Project Dashboard (MUST)**  
Per-project dashboard includes:
- Key info (client, type, status, dates, goals)
- Current phase/milestone
- Open tasks (grouped by status or due date)
- Recent meetings & decisions
- AI assets used in the project
- Status summary (see FR-5.1)

---

### 6.3 Task & Milestone Management

**FR-3.1 – Task CRUD (MUST)**  
- User can create, read, update, and mark tasks Done.
- Task fields:
  - `project_id` (required)
  - `title` (required)
  - `description` (optional)
  - `status` (enum: Backlog / In Progress / Blocked / Done)
  - `priority` (enum: P0 / P1 / P2)
  - `due_date` (optional)
  - `owner_id` (for future multi-user; current user by default)
  - `source_meeting_id` (optional)
  - `linked_asset_id` (optional)
  - `created_at`, `updated_at`

**FR-3.2 – Task Views (MUST)**  
- **By Project:** Task list and simple kanban board (by status).
- **Global “My Work” View:** All tasks across projects assigned to current user.

**FR-3.3 – Milestones (SHOULD)**  
- Each Project can have multiple Milestones:
  - `name`, `description`, `due_date`, `status` (Not Started / In Progress / Done)
- Tasks can be linked to a Milestone.
- Milestone progress can be calculated from tasks OR updated manually.

---

### 6.4 Meeting Notes & Action Items

**FR-4.1 – Meeting Records (MUST)**  
- User can create and manage Meeting records.
- Fields:
  - `project_id` (required)
  - `title` (string)
  - `date` (date)
  - `start_time`, `end_time` (optional)
  - `attendees` (free text or list of names/emails)
  - `notes` (rich text)
  - `decisions` (rich text)
  - `risks` (rich text)
  - `created_at`, `updated_at`

**FR-4.2 – Action Item Creation from Notes (MUST)**  
- From a Meeting detail view, user can:
  - Select/highlight part of the notes and create a Task.
  - Task is automatically linked to:
    - Meeting (`source_meeting_id`)
    - Project (from meeting)
- Created Task opens in an editable modal/form for refinement.

**FR-4.3 – Meeting Listing (SHOULD)**  
- Per project:
  - Display list of recent meetings with date and quick summary.
- Global:
  - Optional list of recent meetings across projects.

---

### 6.5 AI Asset Catalog

**FR-5.1 – Asset Types (MUST)**  
- AI Asset types:
  - `Prompt`
  - `Automation / Workflow`
  - `Integration`
  - `Dataset / KB`
  - `Training Material`
- Stored as enum `asset_type`.

**FR-5.2 – Asset Records (MUST)**  
- Fields:
  - `name` (required)
  - `asset_type` (required)
  - `client_id` (nullable; null = reusable/global)
  - `description` (text)
  - `is_template` (boolean; default false)
  - `configuration` (JSON blob; optional)
  - `location_url` (string, link to external tool/docs/repo)
  - `tags` (string array)
  - `created_at`, `updated_at`

**FR-5.3 – Link Assets to Projects (MUST)**  
- Many-to-many relationship:
  - One Asset can be used in multiple Projects.
  - One Project can use multiple Assets.
- UI:
  - From a Project, user can attach existing assets or create new ones.
  - From an Asset, user can see list of linked projects.

**FR-5.4 – Reusable Templates (SHOULD)**  
- Assets marked `is_template = true` appear in a "Templates" gallery.
- On new project creation or asset add:
  - User can clone a template asset to be client-specific.

---

### 6.6 Project Status & Reporting

**FR-6.1 – Project Status Snapshot (MUST)**  
- Per project, maintain:
  - `status` (On Track / At Risk / Off Track)
  - `status_summary` (short text)
  - `last_status_updated_at` (timestamp)
- Display on Project Dashboard and Client Overview.

**FR-6.2 – Status Summary Helper (SHOULD)**  
- Allow user to:
  - Select time range (e.g., "this week")
  - See:
    - Tasks completed in range
    - Upcoming tasks & milestones
  - Copy combined view as text/markdown for emails.

---

### 6.7 Authentication & Users (MVP)

**FR-7.1 – Single-User Auth (MUST)**  
- Simple authentication for 1 primary user (you).
- Local auth (email + password) for MVP.
- Session management using HttpOnly cookies/JWT.

**FR-7.2 – User Profile (SHOULD)**  
- Store:
  - `name`, `email`, `timezone`
- Used for timestamps and views.

---

## 7. Non-Functional Requirements

**NFR-1 – Technology Stack**

- **Frontend:**
  - React + TypeScript
  - Vite (or CRA alternative) for bundling
  - UI: Tailwind CSS or component library (e.g., MUI/Chakra)  
  - Routing: React Router
  - State & server syncing: React Query (TanStack Query)

- **Backend:**
  - Node.js + TypeScript
  - Express or NestJS (REST API)
  - ORM: Prisma or TypeORM
  - Database: PostgreSQL

- **Infrastructure:**
  - Deployment target(s): e.g., Vercel/Netlify for frontend; Render/Fly.io/Heroku-like for backend
  - Environment separation: `development`, `staging` (optional), `production`

**NFR-2 – Performance**

- Load any primary dashboard screen in < 2 seconds under normal usage.
- API responses within ~250ms for typical queries.

**NFR-3 – Security**

- Enforce authenticated access to all data.
- Use HTTPS in production.
- No sensitive client secrets stored (only config metadata + external links).

**NFR-4 – Portability**

- Database schema versioned via migrations.
- Allow export of core data (Clients, Projects, Tasks, Assets, Meetings) as CSV/JSON (Phase 2).

---

## 8. Architecture Overview

### 8.1 High-Level Architecture

- **Client (Browser)**
  - React SPA
  - Communicates with backend via REST JSON APIs

- **API Server**
  - Node.js / Express (or NestJS)
  - Endpoints for:
    - Auth
    - Clients
    - Contacts
    - Projects
    - Tasks
    - Milestones
    - Meetings
    - AI Assets
  - Business logic & validation

- **Database**
  - PostgreSQL relational database
  - ORM layer abstracts SQL

### 8.2 Request Flow Example

1. User logs in (frontend → `/api/auth/login`).
2. User opens Project Dashboard:
   - `GET /api/projects/:id`
   - `GET /api/projects/:id/tasks`
   - `GET /api/projects/:id/milestones`
   - `GET /api/projects/:id/meetings`
   - `GET /api/projects/:id/assets`
3. User creates a task from a meeting note:
   - `POST /api/tasks` with `source_meeting_id`

---

## 9. Data Model (High-Level)

> Field types are indicative, to be refined in ORM.

### 9.1 User

- `id` (UUID)
- `name` (string)
- `email` (string, unique)
- `password_hash` (string)
- `timezone` (string)
- `created_at`, `updated_at`

### 9.2 Client

- `id` (UUID)
- `name` (string)
- `industry` (string)
- `company_size` (string/enum)
- `timezone` (string)
- `ai_maturity` (string/enum)
- `notes` (text)
- `created_at`, `updated_at`

### 9.3 Contact

- `id` (UUID)
- `client_id` (UUID, FK → Client)
- `name` (string)
- `email` (string)
- `role` (string)
- `phone` (string)
- `notes` (text)
- `created_at`, `updated_at`

### 9.4 Project

- `id` (UUID)
- `client_id` (UUID, FK → Client)
- `name` (string)
- `type` (enum)
- `status` (enum)
- `start_date` (date)
- `target_end_date` (date)
- `goals` (text)
- `description` (text)
- `budget_type` (enum)
- `budget_value` (numeric, optional)
- `tags` (string array)
- `status_indicator` (enum: On Track / At Risk / Off Track)
- `status_summary` (text)
- `last_status_updated_at` (timestamp)
- `created_at`, `updated_at`

### 9.5 Task

- `id` (UUID)
- `project_id` (UUID, FK → Project)
- `title` (string)
- `description` (text)
- `status` (enum)
- `priority` (enum)
- `due_date` (date)
- `owner_id` (UUID, FK → User)
- `milestone_id` (UUID, FK → Milestone, nullable)
- `source_meeting_id` (UUID, FK → Meeting, nullable)
- `linked_asset_id` (UUID, FK → Asset, nullable)
- `created_at`, `updated_at`

### 9.6 Milestone

- `id` (UUID)
- `project_id` (UUID, FK → Project)
- `name` (string)
- `description` (text)
- `due_date` (date)
- `status` (enum: Not Started / In Progress / Done)
- `created_at`, `updated_at`

### 9.7 Meeting

- `id` (UUID)
- `project_id` (UUID, FK → Project)
- `title` (string)
- `date` (date)
- `start_time`, `end_time` (time, optional)
- `attendees` (text or JSON array)
- `notes` (text / rich text)
- `decisions` (text / rich text)
- `risks` (text / rich text)
- `created_at`, `updated_at`

### 9.8 AI Asset

- `id` (UUID)
- `name` (string)
- `asset_type` (enum)
- `client_id` (UUID, FK → Client, nullable)
- `description` (text)
- `is_template` (boolean)
- `configuration` (JSON)
- `location_url` (string)
- `tags` (string array)
- `created_at`, `updated_at`

### 9.9 Project–Asset Join Table

- `project_id` (UUID, FK → Project)
- `asset_id` (UUID, FK → AI Asset)
- Composite PK: (`project_id`, `asset_id`)

---

## 10. API Design (MVP)

Base URL: `/api`

### 10.1 Auth

- `POST /auth/register` (dev only or initial setup)
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### 10.2 Clients

- `GET /clients`
- `POST /clients`
- `GET /clients/:id`
- `PATCH /clients/:id`
- `DELETE /clients/:id` (soft delete / archive)

### 10.3 Contacts

- `GET /clients/:clientId/contacts`
- `POST /clients/:clientId/contacts`
- `PATCH /contacts/:id`
- `DELETE /contacts/:id`

### 10.4 Projects

- `GET /projects`
- `POST /projects`
- `GET /projects/:id`
- `PATCH /projects/:id`
- `DELETE /projects/:id`

### 10.5 Tasks

- `GET /projects/:projectId/tasks`
- `GET /tasks` (global with filters)
- `POST /projects/:projectId/tasks`
- `PATCH /tasks/:id`
- `DELETE /tasks/:id`

### 10.6 Milestones

- `GET /projects/:projectId/milestones`
- `POST /projects/:projectId/milestones`
- `PATCH /milestones/:id`
- `DELETE /milestones/:id`

### 10.7 Meetings

- `GET /projects/:projectId/meetings`
- `POST /projects/:projectId/meetings`
- `GET /meetings/:id`
- `PATCH /meetings/:id`
- `DELETE /meetings/:id`

### 10.8 AI Assets

- `GET /assets` (filters: client_id, asset_type, is_template)
- `POST /assets`
- `GET /assets/:id`
- `PATCH /assets/:id`
- `DELETE /assets/:id`
- `POST /projects/:projectId/assets/:assetId/link`
- `DELETE /projects/:projectId/assets/:assetId/unlink`

---

## 11. UI / Screen Map (MVP)

1. **Login Page**
2. **Dashboard**
   - High-level view: active projects, upcoming tasks, recent meetings
3. **Clients List**
4. **Client Detail**
   - Info, contacts, projects, recent meetings, assets
5. **Projects List**
6. **Project Detail**
   - Summary, tasks (list + kanban), milestones, meetings, assets, status
7. **Tasks – Global “My Work”**
8. **Meetings – List (optional in MVP)**
9. **AI Assets – Library View**
   - Filters by type, client, template

---

## 12. Assumptions

- Single user (you) in MVP; multi-user/roles later.
- No need for real-time collaboration in MVP.
- All AI logic (LLM calls, etc.) will be layered in Phase 2+; MVP focuses on **structure and data**.
- You’re comfortable with basic cloud deployment for Node + Postgres.

---

## 13. Risks & Mitigations

- **Risk:** Overbuilding before validating real workflows.  
  - *Mitigation:* Start with a narrow MVP; iterate after using it on 1–2 real clients.

- **Risk:** Data model complexity grows with new features.  
  - *Mitigation:* Use clear versioned migrations; keep entities normalized.

- **Risk:** Vendor lock-in on specific cloud provider.  
  - *Mitigation:* Use standard components (Node, Postgres) that are portable.

---

## 14. Out of Scope (Original MVP)

> **Note**: Many of these features have been implemented in the CRM transformation. See [CRM-TRANSFORMATION-PLAN.md](CRM-TRANSFORMATION-PLAN.md).

- Client-facing portal
- Automated time tracking / invoicing
- Full AI assistant features (summarization, suggestion) - **Partially implemented**: AI Chatbot & Document Analyzer
- Third-party integrations (email, calendar, Slack/Teams) - **Partially implemented**: Multi-channel chatbot support
- Multi-tenant SaaS capabilities - **Implemented**: Full multi-tenant architecture with row-level isolation

---
