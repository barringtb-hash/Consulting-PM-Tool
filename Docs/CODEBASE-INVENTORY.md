# Complete Codebase Inventory

> Auto-generated: December 29, 2025
>
> This document provides a complete inventory of all components in the AI CRM Platform codebase to prevent accidental breakage during upgrades.

---

## Quick Stats

| Category | Count |
|----------|-------|
| API Modules | 28 |
| Core Services | 14 |
| CRM Services | 3 |
| Core API Routes | 12 |
| Auth Components | 8 |
| Middleware | 6 |
| Tenant Components | 6 |
| Database Models | 178 |
| Database Enums | 142 |
| Frontend Pages | 74 |
| UI Components | 12 |
| Feature Modules | 8 |
| API Hooks | 8 |
| Packages | 7 |
| Validation Schemas | 20 |

---

## 1. API Modules (28)

Location: `pmo/apps/api/src/modules/`

### AI Tools - Phase 1 (Customer Automation)
| Module | Description | Key Files |
|--------|-------------|-----------|
| `chatbot` | Multi-channel AI chatbot | router, service, widget/, webhooks/, channels/ |
| `product-descriptions` | AI product copy generation | router, service, templates |
| `scheduling` | Appointment scheduling | router, service, calendar integrations |
| `intake` | Intelligent form intake | router, service, forms, workflows |

### AI Tools - Phase 2 (Business Intelligence)
| Module | Description | Key Files |
|--------|-------------|-----------|
| `document-analyzer` | OCR & document extraction | router, service, templates/, services/ |
| `content-generator` | Marketing content creation | router, service, templates |
| `lead-scoring` | ML lead prioritization | router, service |
| `prior-auth` | Healthcare prior authorization | router, service |

### AI Tools - Phase 3 (Industry-Specific)
| Module | Description | Key Files |
|--------|-------------|-----------|
| `inventory-forecasting` | Demand forecasting | router, service |
| `compliance-monitor` | Regulatory compliance | router, service |
| `predictive-maintenance` | Equipment failure prediction | router, service |
| `revenue-management` | Dynamic pricing | router, service |
| `safety-monitor` | OSHA compliance | router, service |

### Operations & Platform
| Module | Description | Key Files |
|--------|-------------|-----------|
| `ai-monitoring` | AI usage tracking, cost monitoring | ai-usage.service, ai-client, predictive.service |
| `bug-tracking` | Issue tracking, error collection | router, service, error-collector, ai-prompt |
| `brand-profiles` | Brand identity management | router, service |
| `customer-success` | Health scoring, playbooks | router, services/ |
| `finance-tracking` | Expenses, budgets, forecasting | router, services/, ai/ |
| `feature-flags` | Feature toggle system | router, service |

### Content & Marketing
| Module | Description | Key Files |
|--------|-------------|-----------|
| `campaigns` | Marketing campaigns | router, service |
| `marketing` | Content management | router, service |
| `publishing` | Content publishing | router, service |

### Infrastructure
| Module | Description | Key Files |
|--------|-------------|-----------|
| `mcp` | Model Context Protocol | router, service, tools/ |
| `meetings` | Meeting management | router, service |
| `module-licensing` | Module access control | service |
| `monitoring` | System monitoring | service |
| `usage` | Usage tracking | service |
| `user-preferences` | User settings | router, service |

---

## 2. Core Services (14)

Location: `pmo/apps/api/src/services/`

| Service | Purpose | Dependencies |
|---------|---------|--------------|
| `asset.service.ts` | AI asset management (prompts, workflows, datasets) | prisma |
| `audit.service.ts` | Audit logging for compliance | prisma |
| `client.service.ts` | Legacy client CRUD (deprecated - use Account) | prisma |
| `content-lint.service.ts` | Content linting/validation | - |
| `document.service.ts` | Document upload and management | prisma |
| `lead.service.ts` | Lead management and conversion | prisma, account.service |
| `llm.service.ts` | OpenAI LLM integration | OpenAI SDK |
| `milestone.service.ts` | Project milestone tracking | prisma |
| `project.service.ts` | Project management | prisma |
| `projectMember.service.ts` | Project member management | prisma |
| `projectStatus.service.ts` | Project status updates | prisma |
| `task.service.ts` | Task CRUD and Kanban | prisma |
| `tenant-health.service.ts` | Tenant health monitoring | prisma |
| `user.service.ts` | User management | prisma |

---

## 3. CRM Module

Location: `pmo/apps/api/src/crm/`

### Services
| Service | Purpose |
|---------|---------|
| `account.service.ts` | Account CRUD, hierarchy, merge, health scoring |
| `activity.service.ts` | Activity timeline (calls, emails, meetings) |
| `opportunity.service.ts` | Sales pipeline, stage transitions, forecasting |

### Routes
| Route | Endpoints |
|-------|-----------|
| `account.routes.ts` | `/api/crm/accounts/*` |
| `activity.routes.ts` | `/api/crm/activities/*` |
| `opportunity.routes.ts` | `/api/crm/opportunities/*` |

---

## 4. Core API Routes (12)

Location: `pmo/apps/api/src/routes/`

| Route File | Base Path | Purpose |
|------------|-----------|---------|
| `assets.ts` | `/api/assets` | AI assets CRUD |
| `audit.routes.ts` | `/api/audit` | Audit log queries |
| `clients.ts` | `/api/clients` | Legacy client CRUD |
| `documents.ts` | `/api/documents` | Document upload/management |
| `health.ts` | `/api/healthz` | Health check endpoint |
| `leads.ts` | `/api/leads` | Lead management |
| `milestone.routes.ts` | `/api/milestones` | Milestone CRUD |
| `projects.ts` | `/api/projects` | Project CRUD |
| `public-leads.ts` | `/api/public/leads` | Public lead capture |
| `task.routes.ts` | `/api/tasks` | Task CRUD |
| `tenant-health.routes.ts` | `/api/tenant-health` | Tenant health metrics |
| `users.ts` | `/api/users` | User management |

---

## 5. Authentication System

Location: `pmo/apps/api/src/auth/`

| File | Purpose |
|------|---------|
| `auth.routes.ts` | Login, logout, /me, password reset endpoints |
| `auth.middleware.ts` | requireAuth, optionalAuth middleware |
| `role.middleware.ts` | requireRole, requireAdmin middleware |
| `jwt.ts` | JWT token generation and verification |
| `password.ts` | Password hashing with bcrypt |
| `cookies.ts` | Cookie management with Safari ITP support |
| `password-reset.service.ts` | Password reset token management |
| `client-auth.helper.ts` | Client authentication helpers |

---

## 6. Middleware (6)

Location: `pmo/apps/api/src/middleware/`

| Middleware | Purpose |
|------------|---------|
| `error.middleware.ts` | Global error handling, response formatting |
| `audit.middleware.ts` | Request/response audit logging |
| `module-guard.middleware.ts` | Module access control (requireModule) |
| `rate-limit.middleware.ts` | API rate limiting |
| `tenant-rate-limit.middleware.ts` | Per-tenant rate limiting |
| `api-error-capture.middleware.ts` | Error capture for bug tracking |

---

## 7. Multi-Tenancy System

Location: `pmo/apps/api/src/tenant/`

| File | Purpose |
|------|---------|
| `tenant.context.ts` | AsyncLocalStorage for tenant context |
| `tenant.middleware.ts` | Tenant extraction and context propagation |
| `tenant.service.ts` | Tenant CRUD operations |
| `tenant.routes.ts` | Tenant management endpoints |
| `tenant.types.ts` | Tenant type definitions |
| `index.ts` | Module exports |

---

## 8. Additional API Infrastructure

### Admin
Location: `pmo/apps/api/src/admin/`
| File | Purpose |
|------|---------|
| `tenant-admin.routes.ts` | Super admin tenant management |
| `tenant-admin.service.ts` | Admin operations |

### Analytics
Location: `pmo/apps/api/src/analytics/`
| File | Purpose |
|------|---------|
| `analytics.routes.ts` | Analytics endpoints |
| `analytics.service.ts` | Analytics calculations |
| `analytics.types.ts` | Analytics type definitions |

### Cache
Location: `pmo/apps/api/src/cache/`
| File | Purpose |
|------|---------|
| `redis.client.ts` | Redis connection and caching |

### Integrations
Location: `pmo/apps/api/src/integrations/`
| Directory | Purpose |
|-----------|---------|
| `oauth/` | OAuth providers |
| `sync/` | Data synchronization |
| `integration.routes.ts` | Integration endpoints |
| `integration.types.ts` | Integration types |

### Notifications
Location: `pmo/apps/api/src/notifications/`
| File | Purpose |
|------|---------|
| `notification.routes.ts` | Notification endpoints |
| `notification.service.ts` | Email, in-app notifications |

### Queue
Location: `pmo/apps/api/src/queue/`
| File | Purpose |
|------|---------|
| `queue.config.ts` | Job queue configuration (BullMQ) |

### WebSocket
Location: `pmo/apps/api/src/websocket/`
| File | Purpose |
|------|---------|
| `websocket.server.ts` | Real-time WebSocket server |

---

## 9. Validation Schemas (20)

Location: `pmo/apps/api/src/validation/`

### Core Schemas
| Schema | Purpose |
|--------|---------|
| `account.schema.ts` | Account validation |
| `activity.schema.ts` | Activity validation |
| `asset.schema.ts` | AI asset validation |
| `client.schema.ts` | Client validation |
| `document.schema.ts` | Document validation |
| `lead.schema.ts` | Lead validation |
| `marketing.schema.ts` | Marketing content validation |
| `milestone.schema.ts` | Milestone validation |
| `opportunity.schema.ts` | Opportunity validation |
| `password-reset.schema.ts` | Password reset validation |
| `project.schema.ts` | Project validation |
| `projectStatus.schema.ts` | Project status validation |
| `task.schema.ts` | Task validation |
| `tenant-admin.schema.ts` | Tenant admin validation |
| `user.schema.ts` | User validation |

### Finance Schemas
Location: `pmo/apps/api/src/validation/finance/`
| Schema | Purpose |
|--------|---------|
| `budget.schema.ts` | Budget validation |
| `category.schema.ts` | Expense category validation |
| `expense.schema.ts` | Expense validation |
| `recurring-cost.schema.ts` | Recurring cost validation |

---

## 10. Database Models (178)

Location: `pmo/prisma/schema.prisma`

### Core Platform Models
- User, Tenant, TenantUser, TenantModule, TenantModuleConfig
- TenantBranding, TenantDomain, TenantHealthMetrics
- PasswordReset, FeatureFlag, AuditLog

### CRM Models
- Account, AccountProfitability, CRMContact, ContactEngagement
- Opportunity, OpportunityContact, OpportunityStageHistory
- CRMActivity, Pipeline, SalesPipelineStage

### PMO Models (Legacy)
- Client, Project, ProjectMember, ProjectAIAsset
- Task, TaskAssignee, Milestone, Meeting, Document, Contact

### AI Chatbot Models
- ChatbotConfig, ChatConversation, ChatMessage
- KnowledgeBaseItem, WebhookConfig, WebhookDeliveryLog
- ChannelConfig, ChatAnalytics

### Document Analyzer Models
- DocumentAnalyzerConfig, AnalyzedDocument, ExtractionTemplate
- DocumentIntegration, DocumentBatchJob, DocumentWorkflow

### Finance Models
- Expense, ExpenseCategory, Budget, RecurringCost
- FinanceConfig, FinanceAlert, FinanceInsight

### Customer Success Models
- SuccessPlan, SuccessTask, SuccessObjective
- CTA, CTATask, Playbook, PlaybookTask
- CustomerHealthScore, HealthScoreHistory
- CSActivityLog, CSMetricSnapshot, CSRule
- CSSurvey, CSSurveyResponse

### Scheduling Models
- SchedulingConfig, Appointment, AppointmentType, AppointmentReminder
- CalendarIntegration, BookingPage, BookingData
- BookingIntakeForm, BookingIntakeFormResponse
- WaitlistEntry, NoShowPredictionLog
- Shift, ShiftSchedule, ShiftEmployee, ShiftLocation, ShiftRole
- ShiftSchedulingConfig, ShiftSwapRequest, TimeOffRequest
- EmployeeAvailability

### Intake Models
- IntakeConfig, IntakeForm, IntakeFormField
- IntakeSubmission, IntakeConversation, IntakeDocument, IntakeWorkflow

### Product Descriptions Models
- ProductDescriptionConfig, Product, DescriptionTemplate
- ProductDescription, GeneratedContent, BulkGenerationJob

### Lead Scoring Models
- LeadScoringConfig, ScoredLead, LeadActivity
- NurtureSequence, NurtureEnrollment, LeadScoringAnalytics

### Prior Authorization Models
- PriorAuthConfig, PARequest, PAStatusHistory, PAAppeal
- PATemplate, PayerRule, Provider, PAAnalytics

### Inventory Forecasting Models
- InventoryForecastConfig, InventoryProduct, InventoryLocation
- StockLevel, SalesHistory, DemandForecast
- ForecastScenario, InventoryAlert, InventoryForecast, InventoryForecastAnalytics

### Compliance Monitor Models
- ComplianceMonitorConfig, ComplianceRuleSet, ComplianceRule
- ComplianceCheck, ComplianceViolation, ComplianceAudit
- ComplianceEvidence, ComplianceReport, ComplianceTemplate
- ComplianceMonitorAnalytics

### Predictive Maintenance Models
- PredictiveMaintenanceConfig, Equipment, Sensor, SensorReading
- SensorAnomaly, FailurePrediction, MaintenanceWorkOrder
- SparePart, DowntimeEvent, PredictiveMaintenanceAnalytics

### Revenue Management Models
- RevenueManagementConfig, RateCategory, Competitor, CompetitorRate
- PriceRecommendation, RevenuePromotion, RevenueManagementAnalytics

### Safety Monitor Models
- SafetyMonitorConfig, SafetyIncident, HazardReport
- SafetyInspection, SafetyChecklist, ChecklistCompletion
- TrainingRequirement, TrainingRecord, OshaLog
- RiskAssessment, SafetyMonitorAnalytics

### AI Monitoring Models
- AIUsageEvent, AIUsageSummary
- AlertRule, AlertHistory, Anomaly
- UsageEvent, UsageSummary

### Bug Tracking Models
- Issue, IssueComment, IssueAttachment, IssueLabel
- BugTrackingApiKey, ErrorLog

### Marketing Models
- MarketingContent, Campaign, BrandProfile, BrandAsset
- ContentTemplate, ContentSequence, ContentSequencePiece
- ContentApprovalWorkflow, ContentGeneratorConfig

### Notification & Integration Models
- Notification, Integration, SyncLog
- PublishingConnection, SavedReport

### Infrastructure Models
- InfrastructureMetric, SlowQueryLog
- ProcessingMetrics, VideoMeetingConfig, PaymentConfig, PaymentTransaction, WorkflowProgress

### Leads (Legacy)
- InboundLead

---

## 11. Database Enums (142)

Full list in schema.prisma including:
- Status enums: ProjectStatus, TaskStatus, MilestoneStatus, etc.
- Type enums: AssetType, DocumentType, ContentType, etc.
- Role enums: UserRole, TenantRole, ProjectRole
- Priority enums: Priority, IssuePriority, CTAPriority
- And 130+ more...

---

## 12. Frontend Pages (74)

Location: `pmo/apps/web/src/pages/`

### Root Level (17)
- DashboardPage, LoginPage, ForgotPasswordPage, ResetPasswordPage
- ProjectsPage, ProjectDashboardPage, ProjectSetupPage
- LeadsPage, AssetsPage, MarketingContentPage, MyTasksPage
- AdminCreateUserPage, AdminModulesPage, AdminUserEditPage, AdminUsersListPage

### Admin (4)
- TenantListPage, TenantDetailPage, TenantFormPage, TenantHealthPage

### AI Tools (13)
- ChatbotPage, ProductDescriptionsPage, SchedulingPage, IntakePage
- DocumentAnalyzerPage, ContentGeneratorPage, LeadScoringPage, PriorAuthPage
- InventoryForecastingPage, ComplianceMonitorPage
- PredictiveMaintenancePage, RevenueManagementPage, SafetyMonitorPage

### Bug Tracking (2)
- IssuesPage, IssueDetailPage

### CRM (4)
- AccountsPage, AccountDetailPage, OpportunitiesPage, OpportunityDetailPage

### Customer Success (5)
- CustomerSuccessDashboardPage, CustomerSuccessAnalyticsPage
- CTAsListPage, CTAFormPage, SuccessPlanFormPage

### Demo (2)
- AIToolsShowcasePage, MarketingDemoPage

### Employee (1)
- EmployeePortalPage

### Finance (8)
- FinanceDashboardPage, ExpensesPage, ExpenseFormPage, ExpenseDetailPage
- BudgetsPage, BudgetFormPage, RecurringCostsPage, RecurringCostFormPage

### Infrastructure (6)
- CoreInfrastructurePage, AiMlInfrastructurePage, IotInfrastructurePage
- GeneralCompliancePage, HealthcareCompliancePage, FinancialCompliancePage

### Operations (7)
- OperationsDashboardPage, AIUsagePage, AlertsPage, AnomaliesPage
- CostAnalysisPage, InfrastructurePage, MonitoringAssistantPage

### Public (1)
- PublicBookingPage

---

## 13. Frontend Components

### UI Components (12)
Location: `pmo/apps/web/src/ui/`
- Badge, Button, Card, Checkbox, Input, Modal
- PageHeader, Section, Select, Tabs, Textarea, Toast

### Feature Modules (8)
Location: `pmo/apps/web/src/features/`
- ai-assistant, assets, marketing, meetings
- plugins, projects, status, tasks

### Layouts (4)
Location: `pmo/apps/web/src/layouts/`
- AppLayout, Sidebar, TopBar, MobileMenu

---

## 14. Frontend API Layer

### API Hooks (8)
Location: `pmo/apps/web/src/api/hooks/`
- useBugTracking, useFinance, useMonitoring, useTenantAdmin
- deletionTracker, moduleRegistry, queryKeys, index

### API Clients (26)
Location: `pmo/apps/web/src/api/`
- Core: http, config, auth, queries, modules
- Entities: accounts, assets, campaigns, clients, documents, leads
- Entities: marketing, mcp, meetings, milestones, opportunities
- Entities: projects, publishing, tasks, users
- Features: brand-profiles, bug-tracking, customer-success, tenant-admin
- Storage: tenant-storage, token-storage

---

## 15. Shared Packages (7)

Location: `pmo/packages/`

| Package | Purpose |
|---------|---------|
| `modules` | Shared module definitions |
| `types` | Shared TypeScript types |
| `shared-types` | Cross-app type definitions |
| `chatbot-widget` | Embeddable chatbot widget (@pmo/chatbot-widget) |
| `scheduling-widget` | Embeddable scheduling widget |
| `booking-widget` | Embeddable booking widget |
| `wordpress-plugin` | WordPress integration plugin |

---

## 16. Scripts

### Build/Deploy Scripts
Location: `pmo/scripts/`
| Script | Purpose |
|--------|---------|
| `deploy-migrations.sh` | Production migration deployment |
| `migrate-deploy.sh` | Migration deployment helper |
| `render-build.sh` | Render.com build script |
| `setup-dev.sh` | Development environment setup |
| `install-husky.mjs` | Husky git hooks installation |
| `fix-failed-migration.mjs` | Migration failure recovery |

### Documentation Scripts
| Script | Purpose |
|--------|---------|
| `generate-module-map.mjs` | Generate MODULE-MAP.md |
| `validate-module-docs.mjs` | Validate module documentation |
| `validate-claude-md.mjs` | Validate CLAUDE.md references |

### Migration Scripts
Location: `pmo/apps/api/src/scripts/`
| Script | Purpose |
|--------|---------|
| `migrate-clients-to-accounts.ts` | Client → Account migration |
| `migrate-leads-to-crm-contacts.ts` | Lead → CRMContact migration |
| `migrate-project-pipeline-to-opportunities.ts` | Pipeline → Opportunity migration |
| `migrate-ai-tools-to-accounts.ts` | AI tool account linking |
| `backfill-clients-for-accounts.ts` | Account backfill |
| `fix-project-tenant-ids.ts` | Tenant ID fixes |
| `enable-monitoring-assistant.ts` | Enable monitoring assistant |
| `test-rls.ts` | Row-level security testing |

---

## 17. Configuration Files

### Root Level
| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | CI/CD pipeline |
| `.github/workflows/claude-review.yml` | Claude PR review |
| `.github/workflows/docs-validation.yml` | Documentation validation |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR template |

### PMO Workspace
| File | Purpose |
|------|---------|
| `pmo/package.json` | Workspace configuration |
| `pmo/tsconfig.base.json` | TypeScript base config |
| `pmo/eslint.config.mjs` | ESLint configuration |
| `pmo/playwright.config.ts` | E2E test configuration |
| `pmo/prisma/schema.prisma` | Database schema |

---

## 18. Documentation Files

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | AI assistant guide (primary reference) |
| `Docs/MODULES.md` | Module system documentation |
| `Docs/AI-Tools.md` | AI tools documentation |
| `Docs/CRM-TRANSFORMATION-PLAN.md` | CRM architecture |
| `Docs/FINANCE-TRACKING-PLAN.md` | Finance module |
| `Docs/TECHNICAL-DEBT-REPORT.md` | Technical debt tracking |
| `Docs/API-VERSIONING.md` | API versioning strategy |
| `Docs/TENANT-SYSTEM-ANALYSIS.md` | Multi-tenancy architecture |
| `Docs/CODE-REVIEW-DOCUMENTATION-PLAN.md` | Documentation automation |
| `Docs/MODULE-MAP.md` | Auto-generated module inventory |
| `Docs/CODEBASE-INVENTORY.md` | This document |

---

## Critical Dependencies Map

```
Frontend App
├── React 18 + TypeScript
├── Vite (build tool)
├── TanStack React Query (data fetching)
├── React Router v6 (routing)
├── Tailwind CSS (styling)
├── @dnd-kit (drag & drop)
└── Lucide React (icons)

Backend API
├── Express.js + TypeScript
├── Prisma ORM (database)
├── PostgreSQL (primary database)
├── Redis (caching, queues)
├── JWT (authentication)
├── Zod (validation)
├── OpenAI SDK (AI features)
├── BullMQ (job queues)
└── WebSocket (real-time)

External Integrations
├── Twilio (SMS, WhatsApp)
├── Slack (messaging)
├── Google Calendar
├── Microsoft Calendar
└── Various OAuth providers
```

---

## Update Checklist

When making changes, verify these areas:

### Adding a New Module
- [ ] Create module directory in `pmo/apps/api/src/modules/`
- [ ] Add router and service files
- [ ] Register in `app.ts`
- [ ] Add to MODULES.md
- [ ] Add to CLAUDE.md
- [ ] Create frontend page if needed
- [ ] Add API client and hooks if needed

### Modifying Database Schema
- [ ] Update `pmo/prisma/schema.prisma`
- [ ] Create migration: `npx prisma migrate dev`
- [ ] Update CLAUDE.md database section
- [ ] Update related validation schemas
- [ ] Update related services

### Adding API Endpoints
- [ ] Create/update route file
- [ ] Create validation schema
- [ ] Create/update service
- [ ] Update CLAUDE.md API reference
- [ ] Add frontend API client
- [ ] Add React Query hook if needed

### Adding Frontend Pages
- [ ] Create page component
- [ ] Add route in App.tsx
- [ ] Add navigation in Sidebar if needed
- [ ] Update CLAUDE.md routing section

---

*Generated: December 29, 2025*
*Total Lines of Code: ~150,000+ (estimated)*
