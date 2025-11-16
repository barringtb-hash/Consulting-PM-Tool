# AI Consulting PMO Platform – Implementation Codex (Condensed)

This Markdown file is a build-ready implementation plan for the **AI Consulting PMO Platform** MVP.  
It translates your product requirements into an actionable technical blueprint for a React + Node + Postgres stack.

---

## 0. Scope & Epics

**MVP Epics**

- **E0 – Foundation**: repo scaffolding, infra, CI/CD, auth skeleton.
- **E1 – Clients & Contacts**: basic CRM for AI consulting clients.
- **E2 – Projects**: project records, templates, and project dashboard.
- **E3 – Tasks & Milestones**: backlog, Kanban, milestones.
- **E4 – Meetings**: meeting notes, decisions/risks, tasks from notes.
- **E5 – AI Assets**: prompts/workflows/data assets linked to clients/projects.
- **E6 – Status & Reporting**: per-project status snapshot & summary.
- **E7 – Auth & Profile**: single-user login, profile, and secure access.

**Tech Stack**

- Frontend: React + TypeScript, Vite, React Router, React Query, Tailwind CSS.
- Backend: Node.js + TypeScript, Express, zod validation, Prisma ORM.
- Database: PostgreSQL.
- Infra: GitHub Actions for CI; Render/Fly/Railway + Vercel/Netlify for hosting.

---

## 1. Architecture & Repo Layout

Monorepo layout:

```txt
/pmo
  /apps
    /web          # React + TS (Vite SPA)
    /api          # Express + TS (REST API)
  /packages
    /types        # Shared TypeScript DTOs & zod schemas
    /ui           # Shared UI components (optional)
  /infra          # Deploy scripts / IaC (optional)
  .github/workflows
  README.md
```

**Frontend**

- SPA with protected routes.
- React Query for data fetching/mutations.
- React Hook Form + zod for forms.

**Backend**

- Express server, modular routers (auth, clients, projects, tasks, milestones, meetings, assets).
- Service layer per module.
- Prisma as the DB access layer.

---

## 2. Core Data Model (Conceptual)

Key entities and relationships:

- **User**: single consultant using the system (MVP).
- **Client**: a company you serve.  
  - Attributes: name, industry, company size, timezone, AI maturity, notes.
  - Relations: has many `Contact`, `Project`, `AIAsset`.
- **Contact**: individual at the client.  
  - Attributes: name, email, role, phone, notes.
- **Project**: an engagement with a client.  
  - Attributes: name, type (Discovery/POC/Implementation/Training/Retainer/etc.), status, start/target end, goals, description, tags, budget type.
  - Relations: has many `Task`, `Milestone`, `Meeting`, `ProjectAsset`.
- **Task**: unit of work.  
  - Attributes: title, description, status (Backlog/In Progress/Blocked/Done), priority (P0–P2), due date.
  - Relations: belongs to `Project`, may link to `Meeting` (source) and `AIAsset`.
- **Milestone**: key project checkpoint.  
  - Attributes: name, description, due date, status.
- **Meeting**: meeting instance with notes.  
  - Attributes: title, date/time, attendees, notes, decisions, risks.
  - Relations: belongs to `Project`, can spawn `Task`s from notes.
- **AIAsset**: prompt, workflow, integration, dataset, or training material.  
  - Attributes: name, type, description, config JSON, location URL, tags, isTemplate flag.
  - Relations: may be client-specific and linked to projects via `ProjectAsset`.

Enum examples:

- `ProjectType`: DISCOVERY, POC, IMPLEMENTATION, TRAINING, RETAINER, MIXED.
- `ProjectStatus`: PIPELINE, ACTIVE, ON_HOLD, COMPLETED, CANCELED.
- `TaskStatus`: BACKLOG, IN_PROGRESS, BLOCKED, DONE.
- `Priority`: P0, P1, P2.
- `AssetType`: PROMPT, WORKFLOW, INTEGRATION, DATASET, TRAINING_MATERIAL.

A complete Prisma schema can be taken from the longer spec in chat and dropped into `prisma/schema.prisma`.

---

## 3. API Design (High-Level)

Base URL: `/api`

### Auth (E7)

- `POST /auth/login`  
  Body: `{ email, password }` → sets HttpOnly cookie (JWT).
- `POST /auth/logout`  
  Clears cookie.
- `GET /auth/me`  
  Returns current user profile if authenticated.

### Clients & Contacts (E1)

- `GET /clients?name=&industry=` – list/filter.
- `POST /clients` – create.
- `GET /clients/:id` – detail with basic aggregation.
- `PATCH /clients/:id` – update.
- `DELETE /clients/:id` – archive/soft delete.

Contacts:

- `GET /clients/:id/contacts`
- `POST /clients/:id/contacts`
- `PATCH /contacts/:id`
- `DELETE /contacts/:id`

### Projects (E2)

- `GET /projects?clientId=&status=&type=&tag=`
- `POST /projects`
- `GET /projects/:id`
- `PATCH /projects/:id`
- `DELETE /projects/:id`

Templates:

- `GET /project-templates`
- `POST /projects/from-template/:templateId`  
  Creates project + milestones + tasks based on JSON template.

Summary:

- `GET /projects/:id/summary`  
  Returns aggregated project overview for the UI.

### Tasks & Milestones (E3)

Tasks:

- `GET /projects/:id/tasks`
- `POST /tasks`
- `GET /tasks/:id`
- `PATCH /tasks/:id`
- `DELETE /tasks/:id`
- `PATCH /tasks/:id/move` – Kanban drag/drop.

Milestones:

- `GET /projects/:id/milestones`
- `POST /milestones`
- `GET /milestones/:id`
- `PATCH /milestones/:id`
- `DELETE /milestones/:id`

### Meetings (E4)

- `GET /projects/:id/meetings`
- `POST /meetings`
- `GET /meetings/:id`
- `PATCH /meetings/:id`
- `DELETE /meetings/:id`

Create task from selected notes:

- `POST /meetings/:id/tasks-from-selection`  
  Body: `{ selectionText, task: { title?, priority?, dueDate? } }`  
  Backend auto-links `projectId` and `sourceMeetingId`.

### AI Assets (E5)

- `GET /assets?clientId=&assetType=&isTemplate=`
- `POST /assets`
- `GET /assets/:id`
- `PATCH /assets/:id`
- `DELETE /assets/:id`

Project linking:

- `POST /projects/:projectId/assets/:assetId/link`
- `DELETE /projects/:projectId/assets/:assetId/unlink`

### Status & Reporting (E6)

- `GET /projects/:id/status`  
  Returns counts (tasks by status), overdue tasks, current milestone, upcoming deadlines, risks/decisions.
- `POST /projects/:id/status-summary` (optional)  
  Returns a structured textual summary generated with templates.

---

## 4. Frontend Routes & Screens

Routes:

- `/login` – auth.
- `/dashboard` – high-level overview of active projects, upcoming tasks & meetings.
- `/clients` – list.
- `/clients/:id` – detail: info, contacts, projects, meetings, assets.
- `/projects` – list & filters.
- `/projects/:id` – detail with tabs:
  - Summary
  - Tasks (list + Kanban)
  - Milestones
  - Meetings
  - Assets
  - Status
- `/tasks` – global “My Work” view (all tasks in single-user MVP).
- `/assets` – asset library.
- `/meetings` – optional global meetings list.

Key components:

- Layout (nav + sidebar + outlet).
- Reusable tables, forms, modals, and tag badges.
- Meeting editor (TipTap/React-Quill) with “Create Task from Selection” bubble.
- Project dashboard widgets (status snapshot, progress bars, counts).

---

## 5. Seed Data & Templates

**Seed Script (Prisma)**

- 1 user (seeded login).
- 3 clients with different industries & AI maturity.
- 2–3 projects per client using templates.
- ~15 tasks across statuses and priorities.
- 3 milestones per project.
- 4 meetings with sample notes/risks/decisions.
- 6 AI assets (mix of templates and client-specific).

**Project Templates**

Templates stored as JSON in `/apps/api/templates/*.json`, e.g.:

```json
{
  "id": "discovery-v1",
  "name": "AI Discovery – 3 weeks",
  "project": { "type": "DISCOVERY", "tags": ["discovery", "roadmap"] },
  "milestones": [
    { "name": "Kickoff", "dueInDays": 3 },
    { "name": "Use-case shortlist", "dueInDays": 10 }
  ],
  "tasks": [
    { "title": "Stakeholder interviews", "status": "BACKLOG" },
    { "title": "Data audit", "status": "BACKLOG" }
  ]
}
```

`POST /projects/from-template/:templateId` expands `dueInDays` relative to today.

---

## 6. Testing & CI

**Unit Tests**

- Backend service functions (e.g., status computation, template expansion, meeting → task).
- Validation schemas via zod.

**Integration Tests**

- Node + Postgres (Testcontainers or Docker).
- Auth flow, CRUD routes, and error conditions.

**E2E Tests (Playwright)**

Happy-path scenario:

1. Login.
2. Create a new client.
3. Create a project for that client from a template.
4. Add a meeting with notes.
5. Select text in notes → create task.
6. See the task in the project Kanban board.
7. Link an AI asset to the project.
8. View the project status snapshot & summary.

**CI Pipeline (GitHub Actions)**

- Jobs:
  - `lint-and-typecheck`
  - `test-api`
  - `test-web`
  - `e2e`
  - `build`
- On `main`: deploy API + web, run migrations.

---

## 7. Milestones & Execution Plan

### M0 – Foundation

- Monorepo + workspaces.
- TS, ESLint, Prettier, basic CI.
- Vite + React shell, Express + Prisma API shell.

### M1 – Auth

- User model, password hashing, login/logout.
- `/auth/me` and protected routes in frontend.

### M2 – Clients & Contacts

- API + UI for clients and contacts.
- Client detail page with related projects and meetings stubs.

### M3 – Projects & Templates

- Projects CRUD.
- Templates JSON + create-from-template API & UI.
- Basic project summary view.

### M4 – Tasks & Milestones

- Task CRUD + Kanban.
- Global Tasks view.
- Milestone CRUD and integration into project summary.

### M5 – Meetings

- Meetings CRUD + editor.
- Selection → task flow end-to-end.

### M6 – AI Assets

- Asset CRUD + filters.
- Project asset linking/unlinking.
- Template assets & clone-to-client flow.

### M7 – Status & Reporting

- Status snapshot service & endpoint.
- Status tab UI + dashboard tiles.

### M8 – Hardening & Deploy

- E2E tests green.
- Accessibility & performance pass.
- Deploy to production, set up backups & basic observability.

---

## 8. Definition of Done (Per Feature)

- Type-safe API & validated inputs (zod).
- Passing unit + integration tests for core behavior.
- Frontend error handling & inline validation.
- No unauthenticated access to protected routes.
- Documentation updated (README + this Codex reference).
