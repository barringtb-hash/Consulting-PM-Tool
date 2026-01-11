# AI CRM Platform - Transformation Implementation Plan

## Executive Summary

This document provides a complete implementation plan to transform the existing AI Consulting PMO Platform into a full-fledged, multi-tenant AI-powered CRM SaaS product. The transformation pivots from a single-user consulting tool to a B2B CRM platform that can be sold to customers with AI modules as premium add-ons.

**Key Decisions:**
- **Deployment Model**: Multi-tenant shared infrastructure (single database, tenant isolation via row-level filtering)
- **Product Focus**: CRM-first; existing PMO features become an optional add-on module
- **AI Strategy**: Core CRM free/affordable; AI modules as premium add-ons with usage metering
- **White-Labeling**: Full support (custom branding, custom domains, embeddable widgets)
- **Target Market**: Small consulting partnerships (3-25 customers over 3 years)

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Target Architecture](#2-target-architecture)
3. [Data Model Changes](#3-data-model-changes)
4. [Implementation Phases](#4-implementation-phases)
5. [Phase 0: Foundation & Multi-Tenancy](#5-phase-0-foundation--multi-tenancy)
6. [Phase 1: Core CRM](#6-phase-1-core-crm)
7. [Phase 2: Real-Time & Notifications](#7-phase-2-real-time--notifications)
8. [Phase 3: AI Module Architecture](#8-phase-3-ai-module-architecture)
9. [Phase 4: Integration Hub](#9-phase-4-integration-hub)
10. [Phase 5: White-Label & Custom Domains](#10-phase-5-white-label--custom-domains)
11. [Phase 6: Analytics & Reporting](#11-phase-6-analytics--reporting)
12. [Technical Prerequisites](#12-technical-prerequisites)
13. [File Change Summary](#13-file-change-summary)
14. [Migration Strategy](#14-migration-strategy)
15. [Testing Requirements](#15-testing-requirements)

---

## 1. Current State Assessment

### Existing Technology Stack
- **Frontend**: React 18 + TypeScript, Vite, React Router v6, TanStack React Query, Tailwind CSS
- **Backend**: Node.js + Express + TypeScript, Prisma ORM, Zod validation
- **Database**: PostgreSQL
- **Infrastructure**: Vercel (frontend), Render (backend + database)

### Existing Features to Preserve (as PMO Module)
- Client & Contact management
- Project management with templates
- Task management with Kanban boards
- Milestone tracking
- Meeting notes with action item extraction
- AI Asset catalog
- Document management

### Existing AI Integrations (Already Built)
- **AI Chatbot** (Tool 1.1): Multi-channel support, intent detection, knowledge base
- **Document Analyzer** (Tool 2.1): OCR, field extraction, compliance checking
- **Product Descriptions** (Tool 1.2): AI-generated product content
- **Scheduling Assistant** (Tool 1.3): Appointment booking
- **Client Intake** (Tool 1.4): Form processing
- **Content Generator** (Tool 2.2): Marketing content creation
- **Lead Scoring** (Tool 2.3): ML-based lead prioritization
- **MCP Integration**: Natural language queries via Claude

### Current Limitations
- Single-tenant architecture (no `tenantId` on models)
- No multi-user organization support
- No account hierarchy
- No opportunity/deal pipeline
- No unified activity stream
- No real-time updates (WebSockets)
- No caching layer (Redis)
- No async job queue
- No rate limiting
- Synchronous webhook delivery

---

## 2. Target Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI CRM Platform Architecture                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TENANT LAYER                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │   Tenant A   │  │   Tenant B   │  │   Tenant C   │                       │
│  │ acme.crm.com │  │ beta.crm.com │  │ crm.corp.com │                       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                       │
│         │                 │                 │                                │
│         └─────────────────┼─────────────────┘                                │
│                           │                                                  │
│  ┌────────────────────────▼────────────────────────┐                        │
│  │              API GATEWAY LAYER                   │                        │
│  │  • Tenant Resolution (subdomain/domain/JWT)     │                        │
│  │  • Rate Limiting (per-tenant)                   │                        │
│  │  • Authentication (JWT + cookies)               │                        │
│  │  • Request Logging                              │                        │
│  └────────────────────────┬────────────────────────┘                        │
│                           │                                                  │
│  ┌────────────────────────▼────────────────────────┐                        │
│  │              CORE CRM SERVICES                   │                        │
│  │  ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │                        │
│  │  │  Accounts   │ │  Contacts   │ │ Opportunity│ │                        │
│  │  │  Service    │ │  Service    │ │  Service   │ │                        │
│  │  └─────────────┘ └─────────────┘ └────────────┘ │                        │
│  │  ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │                        │
│  │  │  Activity   │ │   User &    │ │  Pipeline  │ │                        │
│  │  │  Service    │ │   Team      │ │  Service   │ │                        │
│  │  └─────────────┘ └─────────────┘ └────────────┘ │                        │
│  └────────────────────────┬────────────────────────┘                        │
│                           │                                                  │
│  ┌────────────────────────▼────────────────────────┐                        │
│  │              OPTIONAL MODULES                    │                        │
│  │  ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │                        │
│  │  │     PMO     │ │   AI Tools  │ │Integration │ │                        │
│  │  │   Module    │ │   Modules   │ │    Hub     │ │                        │
│  │  └─────────────┘ └─────────────┘ └────────────┘ │                        │
│  └────────────────────────┬────────────────────────┘                        │
│                           │                                                  │
│  ┌────────────────────────▼────────────────────────┐                        │
│  │              INFRASTRUCTURE LAYER                │                        │
│  │  ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │                        │
│  │  │    Redis    │ │  Bull Queue │ │  WebSocket │ │                        │
│  │  │   (Cache)   │ │   (Jobs)    │ │  (Socket.io)│ │                        │
│  │  └─────────────┘ └─────────────┘ └────────────┘ │                        │
│  └────────────────────────┬────────────────────────┘                        │
│                           │                                                  │
│  ┌────────────────────────▼────────────────────────┐                        │
│  │              DATA LAYER                          │                        │
│  │  ┌─────────────────────────────────────────────┐│                        │
│  │  │         PostgreSQL Database                 ││                        │
│  │  │    (Row-Level Tenant Isolation)             ││                        │
│  │  │    Every table has tenantId column          ││                        │
│  │  │    Prisma middleware auto-filters           ││                        │
│  │  └─────────────────────────────────────────────┘│                        │
│  └──────────────────────────────────────────────────┘                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Multi-Tenant Request Flow

```
1. Request: https://acme.yourcrm.com/api/contacts
                    │
2. DNS Resolution   ▼
   *.yourcrm.com → Load Balancer → API Server
                    │
3. Tenant Resolution│
   ┌────────────────▼────────────────┐
   │ Extract tenant from:            │
   │ • Subdomain: acme.yourcrm.com   │
   │ • Custom domain lookup          │
   │ • JWT tenantId claim            │
   └────────────────┬────────────────┘
                    │
4. Set Context      ▼
   req.tenantId = 'tenant_acme_123'
   AsyncLocalStorage.run({ tenantId })
                    │
5. Prisma Middleware│
   ┌────────────────▼────────────────┐
   │ Auto-inject into ALL queries:   │
   │ WHERE tenantId = 'tenant_acme'  │
   │                                 │
   │ Auto-inject into ALL inserts:   │
   │ data: { ...data, tenantId }     │
   └────────────────┬────────────────┘
                    │
6. Response         ▼
   Only Acme's data returned (guaranteed)
```

---

## 3. Data Model Changes

### New Core Models

#### Tenant Model
```prisma
model Tenant {
  id              String    @id @default(cuid())
  name            String
  slug            String    @unique  // Used for subdomain: {slug}.yourcrm.com

  // Subscription
  plan            TenantPlan @default(STARTER)
  planStartedAt   DateTime?
  planExpiresAt   DateTime?
  billingEmail    String?
  stripeCustomerId String?  @unique

  // Settings
  settings        Json?     // Default settings for the tenant

  // Status
  status          TenantStatus @default(ACTIVE)

  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  users           TenantUser[]
  branding        TenantBranding?
  modules         TenantModule[]
  domains         TenantDomain[]

  // All tenant-scoped data
  accounts        Account[]
  contacts        Contact[]
  opportunities   Opportunity[]
  activities      Activity[]
  // ... all other models

  @@index([slug])
  @@index([status])
}

enum TenantPlan {
  TRIAL
  STARTER
  PROFESSIONAL
  ENTERPRISE
}

enum TenantStatus {
  PENDING
  ACTIVE
  SUSPENDED
  CANCELLED
}
```

#### TenantUser Model (Junction)
```prisma
model TenantUser {
  id          String    @id @default(cuid())

  tenantId    String
  userId      Int

  role        TenantRole @default(MEMBER)
  permissions Json?     // Fine-grained permissions

  invitedAt   DateTime  @default(now())
  acceptedAt  DateTime?

  tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tenantId, userId])
  @@index([userId])
}

enum TenantRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}
```

#### TenantBranding Model
```prisma
model TenantBranding {
  id              String  @id @default(cuid())
  tenantId        String  @unique

  // Visual Identity
  logoUrl         String?
  logoLightUrl    String? // For dark backgrounds
  faviconUrl      String?

  // Colors (hex values)
  primaryColor    String  @default("#3B82F6")
  secondaryColor  String  @default("#1E40AF")
  accentColor     String  @default("#10B981")

  // Typography
  fontFamily      String  @default("Inter")

  // Advanced
  customCss       String? @db.Text

  // Email Templates
  emailLogoUrl    String?
  emailFooterText String?

  tenant          Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}
```

#### TenantDomain Model
```prisma
model TenantDomain {
  id          String    @id @default(cuid())
  tenantId    String

  domain      String    @unique  // e.g., "crm.acmecorp.com"
  isPrimary   Boolean   @default(false)

  // Verification
  verified    Boolean   @default(false)
  verifyToken String?   // DNS TXT record for verification
  verifiedAt  DateTime?

  // SSL
  sslStatus   SslStatus @default(PENDING)
  sslExpiresAt DateTime?

  createdAt   DateTime  @default(now())

  tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([domain])
}

enum SslStatus {
  PENDING
  PROVISIONING
  ACTIVE
  EXPIRED
  FAILED
}
```

#### TenantModule Model
```prisma
model TenantModule {
  id          String    @id @default(cuid())
  tenantId    String
  moduleId    String    // e.g., "pmo", "chatbot", "documentAnalyzer"

  enabled     Boolean   @default(false)
  tier        ModuleTier @default(BASIC)

  // Usage Tracking
  usageLimits Json?     // { apiCalls: 1000, documents: 100 }
  currentUsage Json?    // { apiCalls: 450, documents: 23 }
  usageResetAt DateTime?

  // Trial
  trialEndsAt DateTime?

  // Settings
  settings    Json?     // Module-specific configuration

  tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, moduleId])
  @@index([moduleId])
}

enum ModuleTier {
  TRIAL
  BASIC
  PREMIUM
  ENTERPRISE
}
```

### CRM Core Models

#### Account Model (Replaces Client for CRM)
```prisma
model Account {
  id              Int       @id @default(autoincrement())
  tenantId        String

  // Basic Info
  name            String
  website         String?
  phone           String?

  // Hierarchy
  parentAccountId Int?

  // Classification
  type            AccountType @default(PROSPECT)
  industry        String?
  employeeCount   EmployeeCount?
  annualRevenue   Decimal?  @db.Decimal(15, 2)

  // Address
  billingAddress  Json?     // { street, city, state, postalCode, country }
  shippingAddress Json?

  // Health & Engagement (AI-calculated)
  healthScore     Int?      // 0-100
  engagementScore Int?      // 0-100
  churnRisk       Float?    // 0-1
  lastEngagedAt   DateTime?

  // Ownership
  ownerId         Int

  // Metadata
  tags            String[]
  customFields    Json?

  // Status
  archived        Boolean   @default(false)
  archivedAt      DateTime?

  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  tenant          Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  parentAccount   Account?  @relation("AccountHierarchy", fields: [parentAccountId], references: [id])
  childAccounts   Account[] @relation("AccountHierarchy")
  owner           User      @relation("AccountOwner", fields: [ownerId], references: [id])

  contacts        Contact[]
  opportunities   Opportunity[]
  activities      Activity[]

  // Legacy PMO relations (when module enabled)
  projects        Project[]
  documents       Document[]

  @@index([tenantId, type])
  @@index([tenantId, ownerId])
  @@index([tenantId, healthScore])
  @@index([tenantId, archived])
}

enum AccountType {
  PROSPECT
  CUSTOMER
  PARTNER
  COMPETITOR
  CHURNED
  OTHER
}

enum EmployeeCount {
  SOLO        // 1
  MICRO       // 2-10
  SMALL       // 11-50
  MEDIUM      // 51-200
  LARGE       // 201-1000
  ENTERPRISE  // 1000+
}
```

#### Contact Model (Enhanced)
```prisma
model Contact {
  id              Int       @id @default(autoincrement())
  tenantId        String
  accountId       Int?

  // Basic Info
  firstName       String
  lastName        String
  email           String
  phone           String?
  mobile          String?
  jobTitle        String?
  department      String?

  // Lifecycle
  lifecycle       ContactLifecycle @default(LEAD)
  leadSource      LeadSource?

  // Scoring (AI-calculated)
  score           Int?      // 0-100 lead score
  scoreUpdatedAt  DateTime?

  // Communication
  preferredChannel PreferredChannel @default(EMAIL)
  doNotCall       Boolean   @default(false)
  doNotEmail      Boolean   @default(false)

  // Social
  linkedinUrl     String?
  twitterHandle   String?

  // Address
  mailingAddress  Json?

  // Engagement Tracking
  lastContactedAt DateTime?
  lastRespondedAt DateTime?
  emailsReceived  Int       @default(0)
  emailsOpened    Int       @default(0)
  emailsClicked   Int       @default(0)

  // Ownership
  ownerId         Int?

  // Metadata
  tags            String[]
  customFields    Json?
  notes           String?   @db.Text

  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  tenant          Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  account         Account?  @relation(fields: [accountId], references: [id], onDelete: SetNull)
  owner           User?     @relation("ContactOwner", fields: [ownerId], references: [id])

  activities      Activity[]
  opportunities   OpportunityContact[]

  @@unique([tenantId, accountId, email])
  @@index([tenantId, lifecycle])
  @@index([tenantId, ownerId])
  @@index([tenantId, score(sort: Desc)])
  @@index([email])
}

enum ContactLifecycle {
  LEAD
  MQL           // Marketing Qualified Lead
  SQL           // Sales Qualified Lead
  OPPORTUNITY
  CUSTOMER
  EVANGELIST
  CHURNED
}

enum LeadSource {
  WEBSITE
  REFERRAL
  SOCIAL_MEDIA
  EMAIL_CAMPAIGN
  PAID_AD
  EVENT
  COLD_OUTREACH
  PARTNER
  OTHER
}

enum PreferredChannel {
  EMAIL
  PHONE
  SMS
  LINKEDIN
  OTHER
}
```

#### Opportunity Model
```prisma
model Opportunity {
  id              Int       @id @default(autoincrement())
  tenantId        String
  accountId       Int

  // Basic Info
  name            String
  description     String?   @db.Text

  // Pipeline
  pipelineId      Int?      // Custom pipeline (null = default)
  stageId         Int       // Current stage

  // Value
  amount          Decimal?  @db.Decimal(15, 2)
  probability     Int?      // 0-100
  weightedAmount  Decimal?  @db.Decimal(15, 2) // amount * probability

  // Currency
  currency        String    @default("USD")

  // Timeline
  expectedCloseDate DateTime?
  actualCloseDate DateTime?

  // Outcome
  status          OpportunityStatus @default(OPEN)
  lostReason      String?
  lostReasonDetail String?  @db.Text
  competitorId    Int?      // Reference to competitor Account

  // Source
  leadSource      LeadSource?
  campaignId      Int?

  // Ownership
  ownerId         Int

  // Metadata
  tags            String[]
  customFields    Json?

  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  closedAt        DateTime?

  // Relations
  tenant          Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  account         Account   @relation(fields: [accountId], references: [id], onDelete: Cascade)
  stage           PipelineStage @relation(fields: [stageId], references: [id])
  pipeline        Pipeline? @relation(fields: [pipelineId], references: [id])
  owner           User      @relation("OpportunityOwner", fields: [ownerId], references: [id])
  competitor      Account?  @relation("OpportunityCompetitor", fields: [competitorId], references: [id])

  contacts        OpportunityContact[]
  activities      Activity[]
  lineItems       OpportunityLineItem[]
  stageHistory    OpportunityStageHistory[]

  @@index([tenantId, status])
  @@index([tenantId, ownerId])
  @@index([tenantId, stageId])
  @@index([tenantId, expectedCloseDate])
  @@index([tenantId, accountId])
}

enum OpportunityStatus {
  OPEN
  WON
  LOST
}
```

#### Pipeline & Stages
```prisma
model Pipeline {
  id          Int       @id @default(autoincrement())
  tenantId    String

  name        String
  description String?
  isDefault   Boolean   @default(false)

  // Settings
  rotDecayDays Int?     // Days before opportunity is marked stale

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  stages      PipelineStage[]
  opportunities Opportunity[]

  @@unique([tenantId, name])
  @@index([tenantId, isDefault])
}

model PipelineStage {
  id          Int       @id @default(autoincrement())
  pipelineId  Int

  name        String
  order       Int       // Display order
  probability Int       // Default probability for this stage (0-100)

  // Stage Type
  type        StageType @default(OPEN)

  // Visual
  color       String    @default("#3B82F6")

  pipeline    Pipeline  @relation(fields: [pipelineId], references: [id], onDelete: Cascade)
  opportunities Opportunity[]

  @@unique([pipelineId, name])
  @@index([pipelineId, order])
}

enum StageType {
  OPEN
  WON
  LOST
}
```

#### Activity Model (Unified Timeline)
```prisma
model Activity {
  id              Int       @id @default(autoincrement())
  tenantId        String

  // Type
  type            ActivityType

  // Polymorphic Relations
  accountId       Int?
  contactId       Int?
  opportunityId   Int?

  // Content
  subject         String?
  description     String?   @db.Text
  outcome         String?   @db.Text

  // Scheduling
  scheduledAt     DateTime?
  dueAt           DateTime?
  completedAt     DateTime?
  duration        Int?      // Duration in minutes

  // Status
  status          ActivityStatus @default(PLANNED)
  priority        ActivityPriority @default(NORMAL)

  // External References
  externalId      String?   // ID from external system (calendar event, email thread)
  externalSource  String?   // e.g., "google_calendar", "gmail", "outlook"

  // Ownership
  ownerId         Int
  createdById     Int

  // Metadata
  metadata        Json?     // Type-specific data (call recording URL, email headers, etc.)

  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  tenant          Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  account         Account?  @relation(fields: [accountId], references: [id], onDelete: SetNull)
  contact         Contact?  @relation(fields: [contactId], references: [id], onDelete: SetNull)
  opportunity     Opportunity? @relation(fields: [opportunityId], references: [id], onDelete: SetNull)
  owner           User      @relation("ActivityOwner", fields: [ownerId], references: [id])
  createdBy       User      @relation("ActivityCreatedBy", fields: [createdById], references: [id])

  @@index([tenantId, type])
  @@index([tenantId, accountId, createdAt(sort: Desc)])
  @@index([tenantId, contactId, createdAt(sort: Desc)])
  @@index([tenantId, opportunityId, createdAt(sort: Desc)])
  @@index([tenantId, ownerId, status])
  @@index([tenantId, scheduledAt])
  @@index([tenantId, dueAt])
}

enum ActivityType {
  CALL
  EMAIL
  MEETING
  TASK
  NOTE
  SMS
  LINKEDIN_MESSAGE
  CHAT
  DEMO
  PROPOSAL
  CONTRACT
  OTHER
}

enum ActivityStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum ActivityPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

#### Notification Model
```prisma
model Notification {
  id          Int       @id @default(autoincrement())
  tenantId    String
  userId      Int

  // Content
  type        NotificationType
  title       String
  message     String
  actionUrl   String?

  // Reference
  entityType  String?   // "opportunity", "activity", "account"
  entityId    Int?

  // Status
  read        Boolean   @default(false)
  readAt      DateTime?

  // Delivery
  channels    NotificationChannel[]
  deliveredAt DateTime?

  // Priority
  priority    NotificationPriority @default(NORMAL)

  createdAt   DateTime  @default(now())
  expiresAt   DateTime?

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tenantId, userId, read])
  @@index([tenantId, userId, createdAt(sort: Desc)])
}

enum NotificationType {
  // Opportunity Events
  DEAL_ASSIGNED
  DEAL_STAGE_CHANGED
  DEAL_WON
  DEAL_LOST
  DEAL_STALE
  DEAL_CLOSE_DATE_APPROACHING

  // Activity Events
  TASK_ASSIGNED
  TASK_DUE
  TASK_OVERDUE
  MEETING_REMINDER
  MENTION

  // Account Events
  ACCOUNT_HEALTH_DROPPED
  ACCOUNT_ASSIGNED

  // System Events
  INTEGRATION_ERROR
  USAGE_LIMIT_WARNING
  USAGE_LIMIT_REACHED

  // AI Events
  AI_INSIGHT
  LEAD_SCORE_CHANGED
}

enum NotificationChannel {
  IN_APP
  EMAIL
  SLACK
  SMS
  BROWSER_PUSH
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

### Integration Models

```prisma
model Integration {
  id              Int       @id @default(autoincrement())
  tenantId        String

  provider        IntegrationProvider
  name            String    // User-defined name

  // Connection
  status          IntegrationStatus @default(DISCONNECTED)
  credentials     Json?     // Encrypted OAuth tokens, API keys

  // Configuration
  syncSettings    Json?     // What to sync, direction, frequency
  fieldMappings   Json?     // Field mapping configuration

  // Sync Status
  lastSyncAt      DateTime?
  lastSyncStatus  String?
  lastSyncError   String?
  nextSyncAt      DateTime?

  // Webhook
  webhookUrl      String?
  webhookSecret   String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  syncLogs        SyncLog[]

  @@unique([tenantId, provider])
  @@index([tenantId, status])
}

enum IntegrationProvider {
  // Email
  GMAIL
  OUTLOOK

  // Calendar
  GOOGLE_CALENDAR
  OUTLOOK_CALENDAR

  // CRM
  SALESFORCE
  HUBSPOT
  PIPEDRIVE

  // Communication
  SLACK
  TEAMS

  // Automation
  ZAPIER
  MAKE

  // Other
  CUSTOM_WEBHOOK
}

enum IntegrationStatus {
  DISCONNECTED
  CONNECTING
  CONNECTED
  ERROR
  EXPIRED
}

model SyncLog {
  id              Int       @id @default(autoincrement())
  integrationId   Int

  direction       SyncDirection
  entityType      String    // "contact", "opportunity", "activity"
  entityId        Int?
  externalId      String?

  status          SyncStatus
  errorMessage    String?

  payload         Json?     // What was synced (for debugging)

  startedAt       DateTime  @default(now())
  completedAt     DateTime?

  integration     Integration @relation(fields: [integrationId], references: [id], onDelete: Cascade)

  @@index([integrationId, status])
  @@index([integrationId, entityType, entityId])
}

enum SyncDirection {
  INBOUND   // External → CRM
  OUTBOUND  // CRM → External
}

enum SyncStatus {
  PENDING
  IN_PROGRESS
  SUCCESS
  FAILED
  SKIPPED
}
```

### Usage Metering Models

```prisma
model UsageEvent {
  id          BigInt    @id @default(autoincrement())
  tenantId    String
  moduleId    String

  eventType   String    // "api_call", "document_processed", "ai_tokens"
  quantity    Int       @default(1)

  // Context
  userId      Int?
  entityType  String?
  entityId    Int?

  metadata    Json?     // Additional context

  createdAt   DateTime  @default(now())

  @@index([tenantId, moduleId, createdAt])
  @@index([tenantId, createdAt])
}

model UsageSummary {
  id          Int       @id @default(autoincrement())
  tenantId    String
  moduleId    String

  period      UsagePeriod
  periodStart DateTime
  periodEnd   DateTime

  // Aggregated Metrics
  totalEvents Int       @default(0)
  totalQuantity Int     @default(0)

  // Breakdown by event type
  breakdown   Json?     // { api_call: 500, document_processed: 25 }

  // Billing
  estimatedCost Decimal? @db.Decimal(10, 2)

  @@unique([tenantId, moduleId, period, periodStart])
  @@index([tenantId, periodStart])
}

enum UsagePeriod {
  DAILY
  WEEKLY
  MONTHLY
}
```

---

## 4. Implementation Phases

### Phase Overview

| Phase | Name | Duration | Dependencies |
|-------|------|----------|--------------|
| 0 | Foundation & Multi-Tenancy | 4-6 weeks | None |
| 1 | Core CRM | 4-6 weeks | Phase 0 |
| 2 | Real-Time & Notifications | 2-3 weeks | Phase 0, 1 |
| 3 | AI Module Architecture | 3-4 weeks | Phase 0, 1 |
| 4 | Integration Hub | 4-6 weeks | Phase 0, 1 |
| 5 | White-Label & Custom Domains | 2-3 weeks | Phase 0 |
| 6 | Analytics & Reporting | 2-3 weeks | Phase 1 |

### Parallel Work Streams

```
Week:  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21
       ├──────────────────────────────────────────────────────────────
Phase 0│████████████████████│
       │  Foundation        │
       ├────────────────────┼─────────────────────────────────────────
Phase 1│                    │████████████████████│
       │                    │  Core CRM          │
       ├────────────────────┼────────────────────┼────────────────────
Phase 2│                    │                    │█████████████│
       │                    │                    │ Real-Time   │
       ├────────────────────┼────────────────────┼─────────────┼──────
Phase 3│                    │                    │█████████████████│
       │                    │                    │ AI Modules       │
       ├────────────────────┼────────────────────┼──────────────────┼
Phase 4│                    │                    │      │████████████████│
       │                    │                    │      │ Integrations   │
       ├────────────────────┼────────────────────┼──────┼────────────────
Phase 5│                    │████████████│       │      │
       │                    │ White-Label│       │      │
       ├────────────────────┼────────────┼───────┼──────┼────────────────
Phase 6│                    │            │       │      │   │█████████████│
       │                    │            │       │      │   │ Analytics   │
       └────────────────────┴────────────┴───────┴──────┴───┴─────────────
```

---

## 5. Phase 0: Foundation & Multi-Tenancy

### Objectives
1. Transform single-tenant to multi-tenant architecture
2. Add infrastructure components (Redis, Bull, rate limiting)
3. Implement tenant resolution and context propagation
4. Migrate existing data to new tenant model

### Tasks

#### 0.1 Database Schema Changes

**Files to Modify:**
- `pmo/prisma/schema.prisma`

**Actions:**
1. Add all new Tenant-related models (Tenant, TenantUser, TenantBranding, TenantDomain, TenantModule)
2. Add `tenantId` field to ALL existing models:
   - User, Client, Contact, Project, Task, Milestone, Meeting, Document, AIAsset
   - All AI tool models (ChatbotConfig, ChatConversation, etc.)
   - MarketingContent, Campaign, InboundLead
3. Add indexes on `tenantId` for all models
4. Create migration: `npx prisma migrate dev --name add_multi_tenancy`

#### 0.2 Tenant Context Infrastructure

**New Files to Create:**

```
pmo/apps/api/src/
├── tenant/
│   ├── tenant.context.ts        # AsyncLocalStorage for tenant context
│   ├── tenant.middleware.ts     # Extract tenant from request
│   ├── tenant.service.ts        # Tenant CRUD operations
│   ├── tenant.routes.ts         # Tenant management API
│   └── tenant.types.ts          # Tenant-related types
```

**tenant.context.ts:**
```typescript
import { AsyncLocalStorage } from 'async_hooks';

interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  tenantPlan: TenantPlan;
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext {
  const context = tenantStorage.getStore();
  if (!context) {
    throw new Error('Tenant context not initialized');
  }
  return context;
}

export function getTenantId(): string {
  return getTenantContext().tenantId;
}
```

**tenant.middleware.ts:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { tenantStorage } from './tenant.context';
import { prisma } from '../prisma/client';

export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // 1. Try to extract from subdomain
    let tenantSlug = extractSubdomain(req.hostname);

    // 2. Try custom domain lookup
    if (!tenantSlug) {
      const domain = await prisma.tenantDomain.findUnique({
        where: { domain: req.hostname, verified: true },
        include: { tenant: true }
      });
      if (domain) {
        tenantSlug = domain.tenant.slug;
      }
    }

    // 3. Try from JWT (for API calls)
    if (!tenantSlug && req.userId) {
      const tenantUser = await prisma.tenantUser.findFirst({
        where: { userId: req.userId },
        include: { tenant: true }
      });
      if (tenantUser) {
        tenantSlug = tenantUser.tenant.slug;
      }
    }

    if (!tenantSlug) {
      return res.status(400).json({ error: 'Unable to determine tenant' });
    }

    // Look up tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug }
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      return res.status(404).json({ error: 'Tenant not found or inactive' });
    }

    // Run handler within tenant context
    tenantStorage.run(
      {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantPlan: tenant.plan
      },
      () => next()
    );
  } catch (error) {
    next(error);
  }
}

function extractSubdomain(hostname: string): string | null {
  // Handle: acme.yourcrm.com -> acme
  // Handle: localhost -> null
  const parts = hostname.split('.');
  if (parts.length >= 3 && parts[0] !== 'www') {
    return parts[0];
  }
  return null;
}
```

#### 0.3 Prisma Middleware for Tenant Filtering

**Modify:** `pmo/apps/api/src/prisma/client.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { getTenantId } from '../tenant/tenant.context';

const prisma = new PrismaClient();

// Models that require tenant filtering
const TENANT_MODELS = [
  'Account', 'Contact', 'Opportunity', 'Activity', 'Pipeline', 'PipelineStage',
  'Project', 'Task', 'Milestone', 'Meeting', 'Document', 'AIAsset',
  'ChatbotConfig', 'ChatConversation', 'ChatMessage', 'KnowledgeBaseItem',
  'DocumentAnalyzerConfig', 'AnalyzedDocument',
  // ... all other tenant-scoped models
];

prisma.$use(async (params, next) => {
  // Skip for models that don't need tenant filtering
  if (!TENANT_MODELS.includes(params.model || '')) {
    return next(params);
  }

  let tenantId: string;
  try {
    tenantId = getTenantId();
  } catch {
    // No tenant context (e.g., system operations)
    return next(params);
  }

  // Inject tenantId into queries
  if (['findUnique', 'findFirst', 'findMany', 'count', 'aggregate'].includes(params.action)) {
    params.args = params.args || {};
    params.args.where = { ...params.args.where, tenantId };
  }

  // Inject tenantId into creates
  if (params.action === 'create') {
    params.args.data = { ...params.args.data, tenantId };
  }

  // Inject tenantId into createMany
  if (params.action === 'createMany') {
    params.args.data = params.args.data.map((item: any) => ({
      ...item,
      tenantId
    }));
  }

  // Inject tenantId into updates (ensure can only update own tenant's data)
  if (['update', 'updateMany', 'delete', 'deleteMany'].includes(params.action)) {
    params.args.where = { ...params.args.where, tenantId };
  }

  return next(params);
});

export { prisma };
```

#### 0.4 Redis Setup

**New Files:**

```
pmo/apps/api/src/
├── cache/
│   ├── redis.client.ts          # Redis connection
│   ├── cache.service.ts         # Caching utilities
│   └── cache.middleware.ts      # Response caching middleware
```

**redis.client.ts:**
```typescript
import Redis from 'ioredis';
import { env } from '../config/env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redis.quit();
});
```

**Add to env config:**
```typescript
// pmo/apps/api/src/config/env.ts
REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
```

#### 0.5 Bull Queue Setup

**New Files:**

```
pmo/apps/api/src/
├── queue/
│   ├── queue.config.ts          # Queue definitions
│   ├── queue.service.ts         # Job enqueueing
│   └── processors/
│       ├── document.processor.ts
│       ├── email.processor.ts
│       ├── webhook.processor.ts
│       └── sync.processor.ts
```

**queue.config.ts:**
```typescript
import { Queue, Worker, QueueEvents } from 'bullmq';
import { redis } from '../cache/redis.client';

const connection = { connection: redis };

// Queue definitions
export const documentQueue = new Queue('document-processing', connection);
export const emailQueue = new Queue('email-sending', connection);
export const webhookQueue = new Queue('webhook-delivery', connection);
export const syncQueue = new Queue('integration-sync', connection);

// Workers (start in separate process or same process based on config)
export function startWorkers() {
  new Worker('document-processing', processDocument, connection);
  new Worker('email-sending', processEmail, connection);
  new Worker('webhook-delivery', processWebhook, connection);
  new Worker('integration-sync', processSync, connection);
}
```

#### 0.6 Rate Limiting

**New Files:**

```
pmo/apps/api/src/
├── middleware/
│   └── rate-limit.middleware.ts
```

**rate-limit.middleware.ts:**
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../cache/redis.client';
import { getTenantId, getTenantContext } from '../tenant/tenant.context';

// Tenant-aware rate limiting
export const apiRateLimit = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 60 * 1000, // 1 minute
  max: (req) => {
    try {
      const { tenantPlan } = getTenantContext();
      // Different limits per plan
      switch (tenantPlan) {
        case 'ENTERPRISE': return 1000;
        case 'PROFESSIONAL': return 500;
        case 'STARTER': return 200;
        default: return 100;
      }
    } catch {
      return 100; // Default for unauthenticated
    }
  },
  keyGenerator: (req) => {
    try {
      return `rate:${getTenantId()}:${req.ip}`;
    } catch {
      return `rate:anon:${req.ip}`;
    }
  },
  message: { error: 'Too many requests, please try again later' },
});
```

#### 0.7 Update Authentication

**Modify:** `pmo/apps/api/src/auth/auth.service.ts`

Add tenant context to JWT:

```typescript
interface JwtPayload {
  userId: number;
  email: string;
  tenantId: string;      // ADD
  tenantSlug: string;    // ADD
  tenantRole: TenantRole; // ADD
}

export function generateToken(user: User, tenantUser: TenantUser): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      tenantId: tenantUser.tenantId,
      tenantSlug: tenantUser.tenant.slug,
      tenantRole: tenantUser.role,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}
```

#### 0.8 Data Migration Script

**New File:** `pmo/prisma/migrations/migrate-to-multi-tenant.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateToMultiTenant() {
  // 1. Create default tenant for existing data
  const defaultTenant = await prisma.tenant.create({
    data: {
      name: 'Default Organization',
      slug: 'default',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
    }
  });

  // 2. Migrate existing users to TenantUser
  const users = await prisma.user.findMany();
  for (const user of users) {
    await prisma.tenantUser.create({
      data: {
        tenantId: defaultTenant.id,
        userId: user.id,
        role: user.role === 'ADMIN' ? 'OWNER' : 'MEMBER',
        acceptedAt: new Date(),
      }
    });
  }

  // 3. Update all existing records with tenantId
  const models = ['Client', 'Contact', 'Project', 'Task', 'Milestone', 'Meeting', 'Document', 'AIAsset'];

  for (const model of models) {
    await prisma.$executeRawUnsafe(
      `UPDATE "${model}" SET "tenantId" = $1 WHERE "tenantId" IS NULL`,
      defaultTenant.id
    );
  }

  console.log('Migration complete. Default tenant:', defaultTenant.slug);
}

migrateToMultiTenant()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 6. Phase 1: Core CRM

### Objectives
1. Implement Account model (replacing/enhancing Client)
2. Enhance Contact model with lifecycle and scoring
3. Implement Opportunity pipeline
4. Create unified Activity stream
5. Build CRM-focused UI pages

### Tasks

#### 1.1 Account Service & Routes

**New Files:**

```
pmo/apps/api/src/
├── services/
│   └── account.service.ts
├── routes/
│   └── accounts.ts
├── validation/
│   └── account.schema.ts
```

**Key Endpoints:**
```
GET    /api/accounts                    # List with filters
POST   /api/accounts                    # Create account
GET    /api/accounts/:id                # Get with related data
PUT    /api/accounts/:id                # Update
DELETE /api/accounts/:id                # Archive
GET    /api/accounts/:id/hierarchy      # Get parent/child tree
GET    /api/accounts/:id/timeline       # Unified activity timeline
POST   /api/accounts/:id/merge          # Merge duplicate accounts
```

#### 1.2 Contact Enhancements

**Modify:** `pmo/apps/api/src/services/contact.service.ts`

Add lifecycle management, lead scoring integration, engagement tracking.

**New Endpoints:**
```
POST   /api/contacts/:id/convert        # Convert lead to opportunity
PUT    /api/contacts/:id/lifecycle      # Update lifecycle stage
GET    /api/contacts/:id/engagement     # Get engagement history
```

#### 1.3 Opportunity Pipeline

**New Files:**

```
pmo/apps/api/src/
├── services/
│   ├── opportunity.service.ts
│   └── pipeline.service.ts
├── routes/
│   ├── opportunities.ts
│   └── pipelines.ts
├── validation/
│   ├── opportunity.schema.ts
│   └── pipeline.schema.ts
```

**Key Endpoints:**
```
# Pipelines
GET    /api/pipelines                   # List tenant pipelines
POST   /api/pipelines                   # Create custom pipeline
PUT    /api/pipelines/:id               # Update pipeline
DELETE /api/pipelines/:id               # Delete (if no opportunities)
POST   /api/pipelines/:id/stages        # Add stage
PUT    /api/pipelines/:id/stages/reorder # Reorder stages

# Opportunities
GET    /api/opportunities               # List with filters
POST   /api/opportunities               # Create
GET    /api/opportunities/:id           # Get with related data
PUT    /api/opportunities/:id           # Update
DELETE /api/opportunities/:id           # Delete
PUT    /api/opportunities/:id/stage     # Move to different stage
POST   /api/opportunities/:id/won       # Mark as won
POST   /api/opportunities/:id/lost      # Mark as lost with reason
GET    /api/opportunities/:id/timeline  # Activity history
```

#### 1.4 Activity Stream

**New Files:**

```
pmo/apps/api/src/
├── services/
│   └── activity.service.ts
├── routes/
│   └── activities.ts
├── validation/
│   └── activity.schema.ts
```

**Key Endpoints:**
```
GET    /api/activities                  # List with filters (by account, contact, opportunity, owner, type, date range)
POST   /api/activities                  # Create activity (call, email, meeting, note, task)
GET    /api/activities/:id              # Get activity detail
PUT    /api/activities/:id              # Update
DELETE /api/activities/:id              # Delete
PUT    /api/activities/:id/complete     # Mark as completed
GET    /api/activities/upcoming         # Upcoming activities for current user
GET    /api/activities/overdue          # Overdue activities for current user
```

#### 1.5 Frontend CRM Pages

**New Files:**

```
pmo/apps/web/src/
├── pages/
│   ├── crm/
│   │   ├── AccountsPage.tsx           # Account list with filters
│   │   ├── AccountDetailPage.tsx      # Account detail with tabs
│   │   ├── ContactsPage.tsx           # Contact list
│   │   ├── ContactDetailPage.tsx      # Contact detail
│   │   ├── OpportunitiesPage.tsx      # Kanban pipeline view
│   │   ├── OpportunityDetailPage.tsx  # Opportunity detail
│   │   ├── ActivitiesPage.tsx         # Activity list/calendar
│   │   └── PipelineSettingsPage.tsx   # Pipeline configuration
├── components/
│   ├── crm/
│   │   ├── AccountCard.tsx
│   │   ├── AccountForm.tsx
│   │   ├── AccountTimeline.tsx
│   │   ├── ContactCard.tsx
│   │   ├── ContactForm.tsx
│   │   ├── OpportunityCard.tsx
│   │   ├── OpportunityForm.tsx
│   │   ├── PipelineBoard.tsx          # Kanban board
│   │   ├── PipelineStageColumn.tsx
│   │   ├── ActivityForm.tsx
│   │   ├── ActivityTimeline.tsx
│   │   └── QuickActivity.tsx          # Quick log call/email/note
├── api/
│   ├── accounts.ts
│   ├── opportunities.ts
│   ├── activities.ts
│   ├── pipelines.ts
│   └── hooks/
│       ├── accounts/
│       ├── opportunities/
│       ├── activities/
│       └── pipelines/
```

#### 1.6 Default Pipeline Seeding

Create default pipeline when tenant is created:

```typescript
async function createDefaultPipeline(tenantId: string) {
  await prisma.pipeline.create({
    data: {
      tenantId,
      name: 'Sales Pipeline',
      isDefault: true,
      stages: {
        create: [
          { name: 'Lead', order: 1, probability: 10, type: 'OPEN', color: '#6B7280' },
          { name: 'Qualified', order: 2, probability: 25, type: 'OPEN', color: '#3B82F6' },
          { name: 'Proposal', order: 3, probability: 50, type: 'OPEN', color: '#8B5CF6' },
          { name: 'Negotiation', order: 4, probability: 75, type: 'OPEN', color: '#F59E0B' },
          { name: 'Closed Won', order: 5, probability: 100, type: 'WON', color: '#10B981' },
          { name: 'Closed Lost', order: 6, probability: 0, type: 'LOST', color: '#EF4444' },
        ]
      }
    }
  });
}
```

---

## 7. Phase 2: Real-Time & Notifications

### Objectives
1. Implement WebSocket infrastructure for real-time updates
2. Build notification system with multi-channel delivery
3. Add live dashboard updates

### Tasks

#### 2.1 WebSocket Server Setup

**New Files:**

```
pmo/apps/api/src/
├── websocket/
│   ├── socket.server.ts             # Socket.io setup
│   ├── socket.middleware.ts         # Auth + tenant context for sockets
│   ├── socket.events.ts             # Event type definitions
│   └── rooms.service.ts             # Room management (per tenant, per user)
```

**socket.server.ts:**
```typescript
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from '../auth/jwt';
import { redis } from '../cache/redis.client';
import { createAdapter } from '@socket.io/redis-adapter';

export function initializeWebSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(','),
      credentials: true,
    },
    adapter: createAdapter(redis, redis.duplicate()),
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.split('token=')[1];
      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      socket.data.tenantId = payload.tenantId;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, tenantId } = socket.data;

    // Join tenant room
    socket.join(`tenant:${tenantId}`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    console.log(`User ${userId} connected to tenant ${tenantId}`);

    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
    });
  });

  return io;
}

// Emit to tenant
export function emitToTenant(tenantId: string, event: string, data: any) {
  io.to(`tenant:${tenantId}`).emit(event, data);
}

// Emit to specific user
export function emitToUser(userId: number, event: string, data: any) {
  io.to(`user:${userId}`).emit(event, data);
}
```

**socket.events.ts:**
```typescript
export enum SocketEvent {
  // Opportunity events
  OPPORTUNITY_CREATED = 'opportunity:created',
  OPPORTUNITY_UPDATED = 'opportunity:updated',
  OPPORTUNITY_STAGE_CHANGED = 'opportunity:stageChanged',
  OPPORTUNITY_WON = 'opportunity:won',
  OPPORTUNITY_LOST = 'opportunity:lost',

  // Activity events
  ACTIVITY_CREATED = 'activity:created',
  ACTIVITY_COMPLETED = 'activity:completed',

  // Account events
  ACCOUNT_HEALTH_CHANGED = 'account:healthChanged',

  // Notification events
  NOTIFICATION_RECEIVED = 'notification:received',

  // Presence events
  USER_ONLINE = 'presence:online',
  USER_OFFLINE = 'presence:offline',
}
```

#### 2.2 Notification Service

**New Files:**

```
pmo/apps/api/src/
├── notifications/
│   ├── notification.service.ts      # CRUD + delivery logic
│   ├── notification.routes.ts       # API endpoints
│   ├── channels/
│   │   ├── in-app.channel.ts        # WebSocket delivery
│   │   ├── email.channel.ts         # Email delivery
│   │   ├── slack.channel.ts         # Slack delivery
│   │   └── sms.channel.ts           # SMS delivery (Twilio)
│   └── templates/
│       ├── email/
│       │   ├── deal-won.html
│       │   ├── task-assigned.html
│       │   └── ...
│       └── slack/
│           └── blocks.ts            # Slack Block Kit templates
```

**notification.service.ts:**
```typescript
export async function createNotification(params: {
  tenantId: string;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  entityType?: string;
  entityId?: number;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
}) {
  // 1. Create notification record
  const notification = await prisma.notification.create({
    data: {
      ...params,
      channels: params.channels || [NotificationChannel.IN_APP],
    }
  });

  // 2. Deliver via each channel
  for (const channel of notification.channels) {
    await deliverNotification(notification, channel);
  }

  return notification;
}

async function deliverNotification(notification: Notification, channel: NotificationChannel) {
  switch (channel) {
    case NotificationChannel.IN_APP:
      emitToUser(notification.userId, SocketEvent.NOTIFICATION_RECEIVED, notification);
      break;
    case NotificationChannel.EMAIL:
      await emailQueue.add('notification', { notificationId: notification.id });
      break;
    case NotificationChannel.SLACK:
      await slackQueue.add('notification', { notificationId: notification.id });
      break;
    case NotificationChannel.SMS:
      await smsQueue.add('notification', { notificationId: notification.id });
      break;
  }
}
```

#### 2.3 Event Emitters in Services

Add real-time event emission to existing services:

```typescript
// In opportunity.service.ts
export async function moveOpportunityStage(
  opportunityId: number,
  newStageId: number,
  userId: number
) {
  const opportunity = await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { stageId: newStageId },
    include: { stage: true, account: true }
  });

  // Record stage history
  await prisma.opportunityStageHistory.create({
    data: {
      opportunityId,
      fromStageId: opportunity.previousStageId,
      toStageId: newStageId,
      changedById: userId,
    }
  });

  // Emit real-time event
  emitToTenant(opportunity.tenantId, SocketEvent.OPPORTUNITY_STAGE_CHANGED, {
    opportunityId,
    newStage: opportunity.stage,
    accountName: opportunity.account.name,
  });

  return opportunity;
}
```

#### 2.4 Frontend WebSocket Integration

**New Files:**

```
pmo/apps/web/src/
├── websocket/
│   ├── socket.context.tsx           # Socket connection context
│   ├── socket.hooks.ts              # useSocket, useRealTimeUpdates
│   └── socket.events.ts             # Event type definitions (shared)
├── components/
│   └── notifications/
│       ├── NotificationCenter.tsx   # Dropdown in header
│       ├── NotificationItem.tsx
│       ├── NotificationBadge.tsx
│       └── NotificationPreferences.tsx
```

---

## 8. Phase 3: AI Module Architecture

### Objectives
1. Implement module licensing and feature gating
2. Add usage metering
3. Refactor existing AI tools as optional modules
4. Create PMO as optional module

### Tasks

#### 3.1 Module Licensing System

**New Files:**

```
pmo/apps/api/src/
├── modules/
│   ├── module-licensing/
│   │   ├── licensing.service.ts     # Check module access
│   │   ├── licensing.middleware.ts  # Gate routes by module
│   │   └── licensing.routes.ts      # Module management API
│   └── module-registry.ts           # Define all available modules
```

**module-registry.ts:**
```typescript
export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  tier: 'core' | 'premium' | 'enterprise';
  category: 'crm' | 'ai' | 'integration' | 'pmo';
  defaultLimits: Record<string, number>;
}

export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  // Core (always enabled)
  'crm-core': {
    id: 'crm-core',
    name: 'CRM Core',
    description: 'Accounts, Contacts, Opportunities, Activities',
    tier: 'core',
    category: 'crm',
    defaultLimits: { accounts: -1, contacts: -1 }, // -1 = unlimited
  },

  // Premium AI Modules
  'ai-chatbot': {
    id: 'ai-chatbot',
    name: 'AI Chatbot',
    description: 'Customer-facing chatbot with intent detection',
    tier: 'premium',
    category: 'ai',
    defaultLimits: { conversations: 1000, messagesPerConversation: 50 },
  },
  'ai-document-analyzer': {
    id: 'ai-document-analyzer',
    name: 'Document Analyzer',
    description: 'Extract data from documents using AI',
    tier: 'premium',
    category: 'ai',
    defaultLimits: { documentsPerMonth: 100, pagesPerDocument: 50 },
  },
  'ai-lead-scoring': {
    id: 'ai-lead-scoring',
    name: 'AI Lead Scoring',
    description: 'ML-based lead prioritization',
    tier: 'premium',
    category: 'ai',
    defaultLimits: { scoredLeads: 1000 },
  },
  'ai-email-assistant': {
    id: 'ai-email-assistant',
    name: 'Email AI',
    description: 'Smart compose and email insights',
    tier: 'premium',
    category: 'ai',
    defaultLimits: { emailsPerMonth: 500 },
  },

  // Enterprise
  'ai-forecasting': {
    id: 'ai-forecasting',
    name: 'Revenue Forecasting',
    description: 'Predictive analytics for revenue',
    tier: 'enterprise',
    category: 'ai',
    defaultLimits: {},
  },

  // PMO Module (Optional Add-on)
  'pmo': {
    id: 'pmo',
    name: 'Project Management',
    description: 'Projects, Tasks, Milestones, Meetings',
    tier: 'premium',
    category: 'pmo',
    defaultLimits: { projects: 50, tasksPerProject: 500 },
  },

  // Integrations
  'integration-salesforce': {
    id: 'integration-salesforce',
    name: 'Salesforce Sync',
    description: 'Bidirectional Salesforce integration',
    tier: 'enterprise',
    category: 'integration',
    defaultLimits: { syncRecordsPerDay: 10000 },
  },
};
```

#### 3.2 Usage Metering Service

**New File:** `pmo/apps/api/src/modules/usage/usage.service.ts`

```typescript
export async function trackUsage(params: {
  tenantId: string;
  moduleId: string;
  eventType: string;
  quantity?: number;
  userId?: number;
  metadata?: Record<string, any>;
}) {
  // Record event
  await prisma.usageEvent.create({
    data: {
      tenantId: params.tenantId,
      moduleId: params.moduleId,
      eventType: params.eventType,
      quantity: params.quantity || 1,
      userId: params.userId,
      metadata: params.metadata,
    }
  });

  // Check if approaching/exceeding limits
  await checkUsageLimits(params.tenantId, params.moduleId);
}

export async function checkUsageLimits(tenantId: string, moduleId: string) {
  const module = await prisma.tenantModule.findUnique({
    where: { tenantId_moduleId: { tenantId, moduleId } }
  });

  if (!module?.usageLimits) return;

  const currentPeriodStart = startOfMonth(new Date());
  const usage = await prisma.usageEvent.groupBy({
    by: ['eventType'],
    where: {
      tenantId,
      moduleId,
      createdAt: { gte: currentPeriodStart },
    },
    _sum: { quantity: true },
  });

  // Check each limit
  for (const [limitKey, limitValue] of Object.entries(module.usageLimits)) {
    const usedAmount = usage.find(u => u.eventType === limitKey)?._sum.quantity || 0;
    const percentage = (usedAmount / limitValue) * 100;

    if (percentage >= 100) {
      await createNotification({
        tenantId,
        type: 'USAGE_LIMIT_REACHED',
        title: `${moduleId} limit reached`,
        message: `You've reached your ${limitKey} limit for this month.`,
      });
    } else if (percentage >= 80) {
      await createNotification({
        tenantId,
        type: 'USAGE_LIMIT_WARNING',
        title: `${moduleId} approaching limit`,
        message: `You've used ${percentage.toFixed(0)}% of your ${limitKey} limit.`,
      });
    }
  }
}
```

#### 3.3 Module Gating Middleware

```typescript
// licensing.middleware.ts
export function requireModule(moduleId: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = getTenantId();

    const module = await prisma.tenantModule.findUnique({
      where: { tenantId_moduleId: { tenantId, moduleId } }
    });

    if (!module?.enabled) {
      return res.status(403).json({
        error: 'Module not enabled',
        message: `The ${moduleId} module is not enabled for your account. Please upgrade your plan.`,
        upgradeUrl: '/settings/billing',
      });
    }

    // Check if trial expired
    if (module.tier === 'TRIAL' && module.trialEndsAt && module.trialEndsAt < new Date()) {
      return res.status(403).json({
        error: 'Trial expired',
        message: `Your ${moduleId} trial has expired. Please upgrade to continue using this feature.`,
      });
    }

    next();
  };
}
```

---

## 9. Phase 4: Integration Hub

### Objectives
1. Build OAuth connection flow for external services
2. Implement bidirectional sync engine
3. Create field mapping UI
4. Add Zapier/Make webhook support

### Tasks

#### 4.1 OAuth Connection Manager

**New Files:**

```
pmo/apps/api/src/
├── integrations/
│   ├── oauth/
│   │   ├── oauth.service.ts         # OAuth flow handling
│   │   ├── oauth.routes.ts          # OAuth callbacks
│   │   └── providers/
│   │       ├── google.provider.ts
│   │       ├── microsoft.provider.ts
│   │       ├── salesforce.provider.ts
│   │       ├── hubspot.provider.ts
│   │       └── slack.provider.ts
```

#### 4.2 Sync Engine

**New Files:**

```
pmo/apps/api/src/
├── integrations/
│   ├── sync/
│   │   ├── sync.engine.ts           # Core sync orchestration
│   │   ├── sync.scheduler.ts        # Scheduled sync jobs
│   │   ├── conflict-resolver.ts     # Handle sync conflicts
│   │   └── field-mapper.ts          # Map fields between systems
│   ├── connectors/
│   │   ├── salesforce/
│   │   │   ├── salesforce.connector.ts
│   │   │   ├── salesforce.mapper.ts
│   │   │   └── salesforce.types.ts
│   │   ├── hubspot/
│   │   ├── google/
│   │   └── microsoft/
```

#### 4.3 Integration Routes

```
GET    /api/integrations                    # List available integrations
GET    /api/integrations/:provider          # Get integration status
POST   /api/integrations/:provider/connect  # Start OAuth flow
DELETE /api/integrations/:provider          # Disconnect
GET    /api/integrations/:provider/callback # OAuth callback

POST   /api/integrations/:provider/sync     # Trigger manual sync
GET    /api/integrations/:provider/sync/status # Get sync status
GET    /api/integrations/:provider/sync/logs   # Get sync history

GET    /api/integrations/:provider/mappings    # Get field mappings
PUT    /api/integrations/:provider/mappings    # Update field mappings

POST   /api/integrations/webhooks              # Incoming webhook endpoint
```

---

## 10. Phase 5: White-Label & Custom Domains

### Objectives
1. Implement tenant branding system
2. Set up custom domain infrastructure
3. White-label all customer-facing components

### Tasks

#### 5.1 Branding API

**New Files:**

```
pmo/apps/api/src/
├── branding/
│   ├── branding.service.ts
│   ├── branding.routes.ts
│   └── branding.validation.ts
```

**Endpoints:**
```
GET    /api/branding                    # Get current tenant branding
PUT    /api/branding                    # Update branding
POST   /api/branding/logo               # Upload logo
POST   /api/branding/preview            # Generate preview
```

#### 5.2 Custom Domain Management

**New Files:**

```
pmo/apps/api/src/
├── domains/
│   ├── domain.service.ts
│   ├── domain.routes.ts
│   ├── ssl/
│   │   ├── ssl.service.ts            # Let's Encrypt integration
│   │   └── ssl.scheduler.ts          # Auto-renewal
│   └── dns/
│       └── dns-verification.service.ts
```

**Endpoints:**
```
GET    /api/domains                     # List tenant domains
POST   /api/domains                     # Add custom domain
DELETE /api/domains/:id                 # Remove domain
POST   /api/domains/:id/verify          # Trigger DNS verification
GET    /api/domains/:id/instructions    # Get DNS setup instructions
```

#### 5.3 Frontend Theming System

**New Files:**

```
pmo/apps/web/src/
├── theme/
│   ├── ThemeContext.tsx              # Dynamic theme provider
│   ├── theme.service.ts              # Fetch tenant branding
│   ├── theme.utils.ts                # Color manipulation
│   └── default-theme.ts              # Fallback theme
```

**ThemeContext.tsx:**
```typescript
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: branding } = useBranding();

  useEffect(() => {
    if (branding) {
      // Apply CSS custom properties
      document.documentElement.style.setProperty('--color-primary', branding.primaryColor);
      document.documentElement.style.setProperty('--color-secondary', branding.secondaryColor);
      document.documentElement.style.setProperty('--color-accent', branding.accentColor);

      // Update favicon
      if (branding.faviconUrl) {
        updateFavicon(branding.faviconUrl);
      }

      // Inject custom CSS
      if (branding.customCss) {
        injectCustomCss(branding.customCss);
      }
    }
  }, [branding]);

  return <ThemeContext.Provider value={branding}>{children}</ThemeContext.Provider>;
}
```

---

## 11. Phase 6: Analytics & Reporting

### Objectives
1. Build pre-built CRM dashboards
2. Implement custom report builder
3. Add scheduled report delivery

### Tasks

#### 6.1 Analytics Service

**New Files:**

```
pmo/apps/api/src/
├── analytics/
│   ├── analytics.service.ts          # Core analytics queries
│   ├── analytics.routes.ts
│   ├── dashboards/
│   │   ├── sales-dashboard.ts        # Pipeline metrics
│   │   ├── activity-dashboard.ts     # Activity metrics
│   │   ├── account-dashboard.ts      # Account health metrics
│   │   └── team-dashboard.ts         # Team performance
│   └── reports/
│       ├── report.service.ts         # Custom report execution
│       ├── report.scheduler.ts       # Scheduled reports
│       └── export.service.ts         # CSV/Excel/PDF export
```

#### 6.2 Dashboard Endpoints

```
GET    /api/analytics/dashboards/sales          # Sales pipeline metrics
GET    /api/analytics/dashboards/activity       # Activity metrics
GET    /api/analytics/dashboards/accounts       # Account health
GET    /api/analytics/dashboards/team           # Team performance

GET    /api/analytics/pipeline/velocity         # Pipeline velocity metrics
GET    /api/analytics/pipeline/conversion       # Stage conversion rates
GET    /api/analytics/pipeline/forecast         # Revenue forecast

GET    /api/analytics/activities/summary        # Activity summary by type
GET    /api/analytics/activities/leaderboard    # Team activity leaderboard
```

#### 6.3 Custom Reports

```
GET    /api/reports                             # List saved reports
POST   /api/reports                             # Create report definition
GET    /api/reports/:id                         # Get report definition
PUT    /api/reports/:id                         # Update report
DELETE /api/reports/:id                         # Delete report
POST   /api/reports/:id/run                     # Execute report
GET    /api/reports/:id/export/:format          # Export (csv, xlsx, pdf)
POST   /api/reports/:id/schedule                # Schedule report
```

---

## 12. Technical Prerequisites

### Environment Variables to Add

```bash
# pmo/apps/api/.env

# Multi-tenancy
DEFAULT_TENANT_SLUG="app"              # Subdomain for main app
TENANT_DOMAINS="yourcrm.com"           # Base domain for tenants

# Redis
REDIS_URL="redis://localhost:6379"

# Queue
BULL_REDIS_URL="redis://localhost:6379"

# WebSocket
WS_ENABLED="true"

# Integrations - OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""
SALESFORCE_CLIENT_ID=""
SALESFORCE_CLIENT_SECRET=""
HUBSPOT_CLIENT_ID=""
HUBSPOT_CLIENT_SECRET=""
SLACK_CLIENT_ID=""
SLACK_CLIENT_SECRET=""

# SSL/Custom Domains
ACME_EMAIL=""                          # For Let's Encrypt
CLOUDFLARE_API_TOKEN=""                # If using Cloudflare for DNS

# Feature Flags
ENABLE_CUSTOM_DOMAINS="true"
ENABLE_WEBSOCKETS="true"
```

### New Dependencies to Install

```bash
# Backend
npm install --workspace pmo-api \
  ioredis \
  bullmq \
  socket.io \
  @socket.io/redis-adapter \
  express-rate-limit \
  rate-limit-redis \
  acme-client \
  googleapis \
  @microsoft/microsoft-graph-client \
  jsforce \
  @hubspot/api-client \
  @slack/web-api

# Frontend
npm install --workspace pmo-web \
  socket.io-client \
  recharts \
  @tanstack/react-table
```

### Database Indexes to Add

Ensure these indexes exist for query performance:

```prisma
// All tenant-scoped models should have:
@@index([tenantId])
@@index([tenantId, createdAt(sort: Desc)])

// Specific high-cardinality indexes:
@@index([tenantId, ownerId])
@@index([tenantId, status])
@@index([tenantId, accountId])
@@index([tenantId, contactId])
@@index([tenantId, opportunityId])
```

---

## 13. File Change Summary

### New Directories to Create

```
pmo/apps/api/src/
├── tenant/                    # Multi-tenancy infrastructure
├── cache/                     # Redis caching
├── queue/                     # Bull job processing
├── websocket/                 # Socket.io real-time
├── notifications/             # Notification system
├── analytics/                 # Analytics & reporting
├── integrations/              # External integrations
├── branding/                  # White-label branding
├── domains/                   # Custom domain management

pmo/apps/web/src/
├── pages/crm/                 # CRM pages
├── components/crm/            # CRM components
├── components/notifications/  # Notification components
├── websocket/                 # WebSocket client
├── theme/                     # Dynamic theming
```

### Files to Modify

```
pmo/prisma/schema.prisma                 # Add all new models
pmo/apps/api/src/app.ts                  # Add new middleware, routes
pmo/apps/api/src/prisma/client.ts        # Add tenant filtering middleware
pmo/apps/api/src/auth/auth.service.ts    # Add tenant to JWT
pmo/apps/api/src/config/env.ts           # Add new env vars
pmo/apps/web/src/App.tsx                 # Add new routes
pmo/apps/web/src/layouts/Sidebar.tsx     # Update navigation
pmo/apps/web/src/main.tsx                # Add providers
```

### Files to Deprecate (Move to PMO Module)

```
# These become part of the optional PMO module:
pmo/apps/api/src/routes/projects.ts      → pmo/apps/api/src/modules/pmo/
pmo/apps/api/src/routes/tasks.ts         → pmo/apps/api/src/modules/pmo/
pmo/apps/api/src/routes/milestones.ts    → pmo/apps/api/src/modules/pmo/
pmo/apps/api/src/routes/meetings.ts      → pmo/apps/api/src/modules/pmo/

pmo/apps/web/src/pages/ProjectsPage.tsx  → pmo/apps/web/src/pages/pmo/
pmo/apps/web/src/pages/MyTasksPage.tsx   → pmo/apps/web/src/pages/pmo/
```

---

## 14. Migration Strategy

### Phase 0 Migration Steps

1. **Backup existing data**
2. **Run schema migration** to add tenantId columns (nullable initially)
3. **Run data migration script** to:
   - Create default tenant
   - Assign all existing users to default tenant
   - Populate tenantId for all existing records
4. **Make tenantId NOT NULL** in schema
5. **Enable tenant middleware**
6. **Test thoroughly** with existing data

### Rollback Plan

Keep ability to disable multi-tenancy via feature flag:

```typescript
if (env.MULTI_TENANT_ENABLED) {
  app.use(tenantMiddleware);
} else {
  // Set default tenant context for single-tenant mode
  app.use((req, res, next) => {
    tenantStorage.run({ tenantId: 'default', tenantSlug: 'default' }, next);
  });
}
```

---

## 15. Testing Requirements

### Unit Tests Required

- [ ] Tenant context propagation
- [ ] Prisma tenant filtering middleware
- [ ] Rate limiting per tenant
- [ ] Module licensing checks
- [ ] Usage metering calculations
- [ ] Pipeline stage transitions
- [ ] Activity timeline aggregation

### Integration Tests Required

- [ ] Tenant isolation (data from tenant A never visible to tenant B)
- [ ] OAuth connection flows
- [ ] WebSocket authentication and room assignment
- [ ] Notification delivery across channels
- [ ] Sync engine bidirectional operations

### E2E Tests Required

- [ ] New tenant signup flow
- [ ] User invitation and onboarding
- [ ] Full opportunity lifecycle (lead → won/lost)
- [ ] Activity logging across all types
- [ ] Real-time updates in pipeline board
- [ ] Custom domain setup flow
- [ ] Integration connection and sync

---

## Appendix A: API Response Formats

### Standard Success Response
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": ["Invalid email format"]
    }
  }
}
```

### Real-time Event Format
```json
{
  "event": "opportunity:stageChanged",
  "data": {
    "opportunityId": 123,
    "previousStage": { "id": 1, "name": "Lead" },
    "newStage": { "id": 2, "name": "Qualified" },
    "changedBy": { "id": 1, "name": "John Doe" },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## Appendix B: Module Permissions Matrix

| Permission | Owner | Admin | Member | Viewer |
|------------|-------|-------|--------|--------|
| View accounts | ✓ | ✓ | ✓ | ✓ |
| Create accounts | ✓ | ✓ | ✓ | - |
| Edit any account | ✓ | ✓ | - | - |
| Edit own accounts | ✓ | ✓ | ✓ | - |
| Delete accounts | ✓ | ✓ | - | - |
| View all opportunities | ✓ | ✓ | ✓ | ✓ |
| Create opportunities | ✓ | ✓ | ✓ | - |
| Manage pipelines | ✓ | ✓ | - | - |
| Manage integrations | ✓ | ✓ | - | - |
| Manage branding | ✓ | ✓ | - | - |
| Manage users | ✓ | ✓ | - | - |
| Manage billing | ✓ | - | - | - |
| Delete tenant | ✓ | - | - | - |

---

## Appendix C: Default Notification Preferences

| Event | In-App | Email | Slack |
|-------|--------|-------|-------|
| Deal assigned to me | ✓ | ✓ | ✓ |
| Deal stage changed | ✓ | - | - |
| Deal won | ✓ | ✓ | ✓ |
| Deal lost | ✓ | ✓ | - |
| Task assigned | ✓ | ✓ | ✓ |
| Task due today | ✓ | ✓ | - |
| Task overdue | ✓ | ✓ | ✓ |
| Mentioned in note | ✓ | ✓ | ✓ |
| Account health dropped | ✓ | ✓ | - |
| Usage limit warning | ✓ | ✓ | - |

---

## Getting Started

To begin implementation, start with **Phase 0: Foundation & Multi-Tenancy**:

1. Read this entire document to understand the full scope
2. Create a new branch: `git checkout -b feature/crm-transformation`
3. Start with the Prisma schema changes
4. Implement tenant context infrastructure
5. Add Redis and Bull queue
6. Implement rate limiting
7. Run data migration
8. Test tenant isolation thoroughly

**Critical Success Criteria for Phase 0:**
- [ ] Existing functionality continues to work (backward compatible)
- [ ] Tenant context available in all API routes
- [ ] All database queries automatically filtered by tenant
- [ ] No data leakage between tenants (verified by tests)
- [ ] Redis caching functional
- [ ] Job queue processing async tasks
- [ ] Rate limiting enforced per tenant
