# AI Monitoring Implementation Plan

## Executive Summary

This plan extends the existing monitoring infrastructure to provide comprehensive AI-powered monitoring across three domains: **customer/tenant health**, **infrastructure observability**, and **AI workload tracking**. The approach prioritizes building on existing systems with open-source tools to minimize costs while delivering enterprise-grade monitoring for the operations team.

**Target Budget**: Under $100/month (leveraging free tiers and self-hosted solutions)
**Timeline**: 5 phases over ~6-8 weeks
**Audience**: Internal operations team

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        OPERATIONS DASHBOARD                              │
│  (React UI - Unified view for ops team)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │  Tenant Health   │  │  Infrastructure  │  │   AI Workload    │      │
│  │    Monitor       │  │     Monitor      │  │    Monitor       │      │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤      │
│  │ • Health Scores  │  │ • API Latency    │  │ • Token Usage    │      │
│  │ • Usage Trends   │  │ • Error Rates    │  │ • Cost per Tool  │      │
│  │ • Churn Risk     │  │ • DB Performance │  │ • Response Time  │      │
│  │ • Anomalies      │  │ • Memory/CPU     │  │ • Quality Score  │      │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘      │
│           │                     │                     │                 │
├───────────┴─────────────────────┴─────────────────────┴─────────────────┤
│                        ANOMALY DETECTION ENGINE                          │
│  (Statistical + ML-based detection across all metrics)                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │  Usage Events    │  │  Metrics Store   │  │   Alert System   │      │
│  │  (PostgreSQL)    │  │  (TimescaleDB)   │  │   (In-app)       │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                        DATA COLLECTION LAYER                             │
│                                                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │ AI Tool    │ │ API        │ │ Database   │ │ Tenant     │           │
│  │ Middleware │ │ Middleware │ │ Middleware │ │ Health Svc │           │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: AI Tool Instrumentation & Cost Tracking (Week 1-2)

### Objective
Automatically track all AI tool usage with token counts, costs, and performance metrics for billing and transparency.

### 1.1 Create AI Usage Tracking Middleware

**New File**: `pmo/apps/api/src/modules/ai-monitoring/ai-usage.middleware.ts`

Wraps all AI tool calls to capture:
- Request/response timestamps (latency)
- Token counts (prompt + completion)
- Model used (gpt-4, gpt-3.5-turbo, etc.)
- Estimated cost based on current pricing
- Success/failure status
- Tenant ID for cost allocation

### 1.2 AI Cost Configuration

**New File**: `pmo/apps/api/src/modules/ai-monitoring/ai-pricing.config.ts`

Centralized pricing configuration:
```typescript
export const AI_PRICING = {
  'gpt-4': { promptPer1k: 0.03, completionPer1k: 0.06 },
  'gpt-4-turbo': { promptPer1k: 0.01, completionPer1k: 0.03 },
  'gpt-3.5-turbo': { promptPer1k: 0.0005, completionPer1k: 0.0015 },
  // Add other models as needed
};
```

### 1.3 AI Usage Database Models

**Schema additions** to `pmo/prisma/schema.prisma`:

```prisma
model AIUsageEvent {
  id              String   @id @default(cuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id])

  // Tool identification
  toolId          String   // e.g., "chatbot", "document-analyzer", "lead-scoring"
  toolName        String   // Human-readable name
  operation       String   // e.g., "chat", "analyze", "score"

  // Token tracking
  promptTokens    Int      @default(0)
  completionTokens Int     @default(0)
  totalTokens     Int      @default(0)

  // Cost tracking
  model           String   // e.g., "gpt-4-turbo"
  estimatedCost   Decimal  @db.Decimal(10, 6)  // USD with 6 decimal precision

  // Performance
  latencyMs       Int      // Response time in milliseconds
  success         Boolean  @default(true)
  errorType       String?  // If failed, error classification

  // Context
  userId          String?
  entityType      String?  // e.g., "Account", "Lead", "Document"
  entityId        String?
  metadata        Json?    // Additional context

  createdAt       DateTime @default(now())

  @@index([tenantId, createdAt])
  @@index([tenantId, toolId])
  @@index([tenantId, toolId, createdAt])
  @@index([createdAt])  // For global aggregations
}

model AIUsageSummary {
  id              String   @id @default(cuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id])

  // Aggregation period
  periodStart     DateTime
  periodEnd       DateTime
  periodType      String   // "HOURLY", "DAILY", "MONTHLY"

  // Per-tool breakdown
  toolId          String

  // Aggregated metrics
  totalCalls      Int      @default(0)
  successfulCalls Int      @default(0)
  failedCalls     Int      @default(0)

  totalPromptTokens    Int @default(0)
  totalCompletionTokens Int @default(0)
  totalTokens          Int @default(0)

  totalCost       Decimal  @db.Decimal(10, 4)

  avgLatencyMs    Int      @default(0)
  p95LatencyMs    Int      @default(0)
  p99LatencyMs    Int      @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([tenantId, periodStart, periodType, toolId])
  @@index([tenantId, periodType, periodStart])
}
```

### 1.4 AI Usage Service

**New File**: `pmo/apps/api/src/modules/ai-monitoring/ai-usage.service.ts`

Core functions:
- `trackAIUsage(event)` - Record individual AI call
- `getAIUsageSummary(tenantId, period)` - Aggregated usage by tool
- `getAICostBreakdown(tenantId, startDate, endDate)` - Cost allocation report
- `getAIUsageTrends(tenantId, toolId)` - Usage trends over time
- `aggregateHourlyUsage()` - Scheduled job to create summaries

### 1.5 Instrument Existing AI Tools

Update each AI tool module to use the tracking middleware:

| Tool | File to Modify |
|------|----------------|
| Chatbot | `pmo/apps/api/src/modules/chatbot/chatbot.service.ts` |
| Document Analyzer | `pmo/apps/api/src/modules/document-analyzer/document-analyzer.service.ts` |
| Content Generator | `pmo/apps/api/src/modules/content-generator/content-generator.service.ts` |
| Lead Scoring | `pmo/apps/api/src/modules/lead-scoring/lead-scoring.service.ts` |
| Product Descriptions | `pmo/apps/api/src/modules/product-descriptions/product-descriptions.service.ts` |
| Scheduling | `pmo/apps/api/src/modules/scheduling/scheduling.service.ts` |
| Intake | `pmo/apps/api/src/modules/intake/intake.service.ts` |
| Prior Auth | `pmo/apps/api/src/modules/prior-auth/prior-auth.service.ts` |
| Inventory Forecasting | `pmo/apps/api/src/modules/inventory-forecasting/inventory-forecasting.service.ts` |
| Compliance Monitor | `pmo/apps/api/src/modules/compliance-monitor/compliance-monitor.service.ts` |
| Predictive Maintenance | `pmo/apps/api/src/modules/predictive-maintenance/predictive-maintenance.service.ts` |
| Revenue Management | `pmo/apps/api/src/modules/revenue-management/revenue-management.service.ts` |
| Safety Monitor | `pmo/apps/api/src/modules/safety-monitor/safety-monitor.service.ts` |

### 1.6 Deliverables
- [ ] AI pricing configuration file
- [ ] AIUsageEvent and AIUsageSummary Prisma models
- [ ] AI usage tracking service with cost calculation
- [ ] Middleware wrapper for OpenAI/LLM calls
- [ ] All 13 AI tools instrumented
- [ ] Hourly aggregation job
- [ ] API endpoints for usage queries

---

## Phase 2: Infrastructure Monitoring (Week 2-3)

### Objective
Add comprehensive API and database performance monitoring without external services.

### 2.1 API Metrics Middleware

**New File**: `pmo/apps/api/src/middleware/metrics.middleware.ts`

Collects for every request:
- Response time (histogram with percentiles)
- Status code distribution
- Request rate per endpoint
- Request size / response size
- Error rate by endpoint
- Concurrent request count

### 2.2 Metrics Collection Service

**New File**: `pmo/apps/api/src/modules/monitoring/metrics.service.ts`

In-memory metrics store with:
- Rolling window aggregations (1min, 5min, 1hr)
- Percentile calculations (p50, p95, p99)
- Automatic cleanup of old data
- Export to database for persistence

### 2.3 Database Performance Tracking

**New File**: `pmo/apps/api/src/modules/monitoring/db-monitor.service.ts`

Tracks:
- Query execution time (via Prisma middleware)
- Slow query logging (threshold: 100ms)
- Connection pool utilization
- Database size per tenant
- Table row counts

### 2.4 System Health Metrics

**New File**: `pmo/apps/api/src/modules/monitoring/system-health.service.ts`

Collects:
- Memory usage (heap, RSS)
- CPU usage (process level)
- Event loop lag
- Active handles/requests
- Uptime

### 2.5 Infrastructure Metrics Database Model

```prisma
model InfrastructureMetric {
  id          String   @id @default(cuid())

  metricType  String   // "API_LATENCY", "DB_QUERY", "MEMORY", "CPU", etc.
  metricName  String   // Specific metric (e.g., "POST /api/chatbot/chat")

  // Aggregated values
  count       Int      @default(0)
  sum         Float    @default(0)
  min         Float?
  max         Float?
  avg         Float?
  p50         Float?
  p95         Float?
  p99         Float?

  // Time window
  windowStart DateTime
  windowEnd   DateTime
  windowSize  String   // "1m", "5m", "1h", "1d"

  // Optional tenant scope (null = system-wide)
  tenantId    String?

  metadata    Json?

  createdAt   DateTime @default(now())

  @@index([metricType, windowStart])
  @@index([tenantId, metricType, windowStart])
}

model SlowQueryLog {
  id          String   @id @default(cuid())

  query       String   // Sanitized query (no values)
  model       String   // Prisma model
  operation   String   // findMany, create, etc.
  durationMs  Int

  tenantId    String?
  userId      String?

  createdAt   DateTime @default(now())

  @@index([createdAt])
  @@index([durationMs])
}
```

### 2.6 Enhanced Health Check Endpoint

**Modify**: `pmo/apps/api/src/routes/health.ts`

Expand `/api/healthz` to return:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00Z",
  "uptime": 86400,
  "version": "1.0.0",
  "checks": {
    "database": { "status": "ok", "latencyMs": 5 },
    "redis": { "status": "ok", "latencyMs": 2 },
    "memory": { "status": "ok", "usedMB": 256, "limitMB": 512 },
    "eventLoop": { "status": "ok", "lagMs": 1 }
  },
  "metrics": {
    "requestsPerMinute": 150,
    "avgLatencyMs": 45,
    "errorRate": 0.02
  }
}
```

### 2.7 Deliverables
- [ ] API metrics middleware with histogram tracking
- [ ] Metrics collection service with rolling windows
- [ ] Database query performance tracking
- [ ] Slow query logging with threshold alerts
- [ ] System health metrics (memory, CPU, event loop)
- [ ] Enhanced health check endpoint
- [ ] Metrics persistence with hourly aggregation

---

## Phase 3: Anomaly Detection Engine (Week 3-4)

### Objective
Implement statistical anomaly detection across usage, health, cost, and security dimensions.

### 3.1 Anomaly Detection Service

**New File**: `pmo/apps/api/src/modules/monitoring/anomaly-detection.service.ts`

Detection algorithms:
- **Z-Score Detection**: Flag values > 3 standard deviations from mean
- **Moving Average Deviation**: Compare to 7-day rolling average
- **Rate of Change**: Detect sudden spikes/drops (>50% change)
- **Threshold Breach**: Configurable static thresholds

### 3.2 Anomaly Types & Rules

```typescript
export const ANOMALY_RULES = {
  // Usage anomalies
  USAGE_SPIKE: {
    metric: 'daily_api_calls',
    method: 'zscore',
    threshold: 3,
    severity: 'WARNING',
  },
  USAGE_DROP: {
    metric: 'daily_active_users',
    method: 'rate_of_change',
    threshold: -0.5, // 50% drop
    severity: 'CRITICAL',
  },

  // Health anomalies
  HEALTH_DECLINE: {
    metric: 'health_score',
    method: 'rate_of_change',
    threshold: -0.2, // 20% drop
    lookbackDays: 7,
    severity: 'WARNING',
  },
  CHURN_RISK_SPIKE: {
    metric: 'churn_risk',
    method: 'threshold',
    threshold: 0.7,
    severity: 'CRITICAL',
  },

  // Cost anomalies
  AI_COST_SPIKE: {
    metric: 'daily_ai_cost',
    method: 'zscore',
    threshold: 2.5,
    severity: 'WARNING',
  },
  TOKEN_USAGE_SPIKE: {
    metric: 'daily_tokens',
    method: 'rate_of_change',
    threshold: 2.0, // 200% increase
    severity: 'INFO',
  },

  // Security anomalies
  FAILED_LOGIN_SPIKE: {
    metric: 'failed_logins',
    method: 'threshold',
    threshold: 10, // per hour
    severity: 'CRITICAL',
  },
  OFF_HOURS_ACCESS: {
    metric: 'api_calls',
    method: 'time_based',
    offHours: { start: 22, end: 6 },
    threshold: 100,
    severity: 'WARNING',
  },

  // Infrastructure anomalies
  LATENCY_SPIKE: {
    metric: 'api_p95_latency',
    method: 'threshold',
    threshold: 2000, // ms
    severity: 'WARNING',
  },
  ERROR_RATE_SPIKE: {
    metric: 'error_rate',
    method: 'threshold',
    threshold: 0.05, // 5%
    severity: 'CRITICAL',
  },

  // Data quality anomalies
  STALE_DATA: {
    metric: 'last_activity_hours',
    method: 'threshold',
    threshold: 168, // 7 days
    severity: 'INFO',
  },
};
```

### 3.3 Anomaly Database Model

```prisma
model Anomaly {
  id          String   @id @default(cuid())
  tenantId    String?  // null for system-wide

  // Classification
  type        String   // From ANOMALY_RULES keys
  severity    String   // CRITICAL, WARNING, INFO
  category    String   // USAGE, HEALTH, COST, SECURITY, INFRASTRUCTURE, DATA_QUALITY

  // Detection details
  metric      String
  expectedValue Float?
  actualValue   Float
  deviation     Float?   // How far from expected (%)

  // Context
  entityType  String?  // e.g., "Tenant", "User", "Endpoint"
  entityId    String?
  metadata    Json?

  // Status
  status      String   @default("OPEN") // OPEN, ACKNOWLEDGED, RESOLVED, FALSE_POSITIVE
  acknowledgedAt DateTime?
  acknowledgedBy String?
  resolvedAt     DateTime?
  resolvedBy     String?
  resolution     String?  // Notes on how it was resolved

  detectedAt  DateTime @default(now())

  @@index([status, severity])
  @@index([tenantId, status])
  @@index([category, detectedAt])
  @@index([detectedAt])
}
```

### 3.4 Anomaly Detection Scheduler

**New File**: `pmo/apps/api/src/modules/monitoring/anomaly-scheduler.ts`

Scheduled jobs:
- **Every 5 minutes**: Infrastructure anomalies (latency, errors)
- **Every hour**: Usage and cost anomalies
- **Every 6 hours**: Health score anomalies
- **Daily**: Data quality checks, security pattern analysis

### 3.5 Baseline Calculation

**New File**: `pmo/apps/api/src/modules/monitoring/baseline.service.ts`

Maintains rolling baselines:
- 7-day moving average per metric per tenant
- Day-of-week patterns (Monday vs Sunday behavior)
- Hour-of-day patterns (business hours vs off-hours)
- Seasonal adjustments (month-over-month trends)

### 3.6 Deliverables
- [ ] Statistical anomaly detection algorithms (z-score, moving average, rate of change)
- [ ] Configurable anomaly rules for all 5 categories
- [ ] Anomaly database model with status tracking
- [ ] Scheduled detection jobs at appropriate intervals
- [ ] Baseline calculation with pattern awareness
- [ ] False positive marking and learning

---

## Phase 4: Alert System & Notifications (Week 4-5)

### Objective
Build an internal alerting system that notifies the ops team of anomalies and critical events.

### 4.1 Alert Configuration Model

```prisma
model AlertRule {
  id          String   @id @default(cuid())

  name        String
  description String?

  // Trigger conditions
  anomalyType String?  // Link to specific anomaly type
  category    String?  // Or match any in category
  severity    String[] // Which severities trigger this

  // Actions
  channels    String[] // "EMAIL", "SLACK", "WEBHOOK", "IN_APP"
  recipients  String[] // Email addresses, Slack channels, webhook URLs

  // Throttling
  cooldownMinutes Int  @default(60)  // Don't re-alert within this window
  maxAlertsPerDay Int  @default(10)

  // Status
  enabled     Boolean  @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model AlertHistory {
  id          String   @id @default(cuid())

  alertRuleId String
  anomalyId   String?

  // What was sent
  channel     String
  recipient   String
  subject     String
  body        String

  // Delivery status
  status      String   // SENT, FAILED, THROTTLED
  errorMessage String?

  sentAt      DateTime @default(now())

  @@index([alertRuleId, sentAt])
  @@index([sentAt])
}
```

### 4.2 Alert Service

**New File**: `pmo/apps/api/src/modules/monitoring/alert.service.ts`

Functions:
- `triggerAlert(anomaly)` - Process anomaly and send alerts
- `checkThrottling(ruleId)` - Prevent alert fatigue
- `sendEmailAlert(recipient, subject, body)` - Email delivery
- `sendSlackAlert(channel, message)` - Slack webhook
- `createInAppNotification(userId, alert)` - Use existing Notification model
- `getAlertHistory(filters)` - Query past alerts

### 4.3 Alert Digest

Daily digest email summarizing:
- New anomalies by severity
- Anomalies resolved
- Top affected tenants
- Infrastructure health summary
- AI cost summary

### 4.4 In-App Alert Center

Extend existing Notification system:
- New notification types for monitoring alerts
- Badge count for unacknowledged anomalies
- Quick actions: Acknowledge, Resolve, Mark False Positive

### 4.5 Deliverables
- [ ] Alert rule configuration model
- [ ] Alert service with multi-channel delivery
- [ ] Throttling to prevent alert fatigue
- [ ] Daily digest email
- [ ] In-app notification integration
- [ ] Alert history and audit trail

---

## Phase 5: Operations Dashboard (Week 5-7)

### Objective
Build a unified monitoring dashboard for the operations team.

### 5.1 Dashboard Pages

**New Files in** `pmo/apps/web/src/pages/monitoring/`:

#### 5.1.1 Monitoring Overview (`MonitoringOverviewPage.tsx`)
- System health summary (green/yellow/red)
- Active anomalies by category
- Key metrics sparklines (requests, errors, AI costs)
- Recent alerts feed

#### 5.1.2 Tenant Health Dashboard (`TenantHealthDashboardPage.tsx`)
- All tenants health score heatmap
- Churn risk leaderboard (highest risk first)
- Health score trends chart
- Drill-down to individual tenant

#### 5.1.3 Infrastructure Dashboard (`InfrastructureDashboardPage.tsx`)
- API latency (p50, p95, p99) charts
- Error rate over time
- Slowest endpoints table
- Database query performance
- System resources (memory, CPU)

#### 5.1.4 AI Usage Dashboard (`AIUsageDashboardPage.tsx`)
- Total AI costs (daily, MTD)
- Cost breakdown by tool (pie chart)
- Cost breakdown by tenant (table)
- Token usage trends
- Latency by tool
- Success/failure rates

#### 5.1.5 Anomaly Management (`AnomalyManagementPage.tsx`)
- Active anomalies list with filters
- Anomaly detail view
- Acknowledge/Resolve actions
- False positive marking
- Historical anomaly search

#### 5.1.6 Alert Configuration (`AlertConfigurationPage.tsx`)
- Alert rules list
- Create/edit alert rules
- Alert history
- Test alert delivery

### 5.2 Dashboard Components

**New Files in** `pmo/apps/web/src/components/monitoring/`:

- `HealthScoreHeatmap.tsx` - Grid visualization of tenant health
- `MetricsSparkline.tsx` - Small inline charts
- `AnomalyCard.tsx` - Anomaly summary with actions
- `CostBreakdownChart.tsx` - Pie/bar chart for AI costs
- `LatencyChart.tsx` - Time-series latency visualization
- `AlertFeed.tsx` - Real-time alert stream
- `TenantHealthCard.tsx` - Individual tenant summary

### 5.3 API Endpoints

**New File**: `pmo/apps/api/src/modules/monitoring/monitoring.routes.ts`

Endpoints:
```
GET  /api/monitoring/overview          - Dashboard summary
GET  /api/monitoring/tenants           - All tenant health summaries
GET  /api/monitoring/tenants/:id       - Single tenant deep dive
GET  /api/monitoring/infrastructure    - Infra metrics
GET  /api/monitoring/ai-usage          - AI usage and costs
GET  /api/monitoring/ai-usage/by-tenant - AI costs per tenant
GET  /api/monitoring/ai-usage/by-tool  - AI costs per tool
GET  /api/monitoring/anomalies         - List anomalies (with filters)
GET  /api/monitoring/anomalies/:id     - Anomaly detail
POST /api/monitoring/anomalies/:id/acknowledge
POST /api/monitoring/anomalies/:id/resolve
POST /api/monitoring/anomalies/:id/false-positive
GET  /api/monitoring/alerts/rules      - Alert rules
POST /api/monitoring/alerts/rules      - Create rule
PUT  /api/monitoring/alerts/rules/:id  - Update rule
GET  /api/monitoring/alerts/history    - Alert history
POST /api/monitoring/alerts/test       - Test alert delivery
```

### 5.4 React Query Hooks

**New File**: `pmo/apps/web/src/api/hooks/useMonitoring.ts`

Hooks for all monitoring endpoints with appropriate caching and refresh intervals.

### 5.5 Navigation Integration

Add "Monitoring" section to Sidebar (admin only):
- Overview
- Tenant Health
- Infrastructure
- AI Usage
- Anomalies
- Alerts

### 5.6 Deliverables
- [ ] 6 monitoring dashboard pages
- [ ] 7+ reusable monitoring components
- [ ] 15+ API endpoints
- [ ] React Query hooks
- [ ] Sidebar navigation (admin-restricted)

---

## Phase 6: Predictive Analytics (Week 7-8)

### Objective
Add forward-looking predictions for churn, usage, and costs.

### 6.1 Churn Prediction Model

**New File**: `pmo/apps/api/src/modules/monitoring/churn-prediction.service.ts`

Features for prediction:
- Health score trend (last 30 days)
- Login frequency trend
- Feature usage breadth
- Support ticket frequency
- Days since last activity
- Seat utilization
- Contract renewal proximity

Simple logistic regression (no ML dependencies):
```typescript
// Weighted feature scoring
const churnScore =
  (healthDecline * 0.25) +
  (loginDecline * 0.20) +
  (featureDecline * 0.15) +
  (supportIncrease * 0.15) +
  (inactivityDays * 0.10) +
  (lowSeatUtil * 0.10) +
  (renewalProximity * 0.05);
```

### 6.2 Usage Forecasting

**New File**: `pmo/apps/api/src/modules/monitoring/usage-forecast.service.ts`

Simple forecasting:
- Linear regression on 30-day trend
- Seasonal adjustment (day-of-week weights)
- Confidence intervals

Outputs:
- Projected API calls (next 7/30 days)
- Projected AI token usage
- Projected storage consumption

### 6.3 Cost Projections

**New File**: `pmo/apps/api/src/modules/monitoring/cost-forecast.service.ts`

Calculates:
- Projected AI costs (end of month)
- Trend direction and magnitude
- Alerts if projected costs exceed thresholds

### 6.4 Deliverables
- [ ] Churn prediction based on multi-factor scoring
- [ ] Usage forecasting with trend analysis
- [ ] Cost projection and threshold alerts
- [ ] Prediction visualization in dashboards

---

## Technical Specifications

### Database Additions Summary

New tables:
1. `AIUsageEvent` - Individual AI call tracking
2. `AIUsageSummary` - Aggregated AI usage
3. `InfrastructureMetric` - API/DB/system metrics
4. `SlowQueryLog` - Slow query tracking
5. `Anomaly` - Detected anomalies
6. `AlertRule` - Alert configurations
7. `AlertHistory` - Sent alerts log

### New API Modules

```
pmo/apps/api/src/modules/
├── ai-monitoring/
│   ├── index.ts
│   ├── ai-usage.service.ts
│   ├── ai-usage.middleware.ts
│   ├── ai-pricing.config.ts
│   └── ai-monitoring.routes.ts
├── monitoring/
│   ├── index.ts
│   ├── metrics.service.ts
│   ├── metrics.middleware.ts
│   ├── db-monitor.service.ts
│   ├── system-health.service.ts
│   ├── anomaly-detection.service.ts
│   ├── anomaly-scheduler.ts
│   ├── baseline.service.ts
│   ├── alert.service.ts
│   ├── churn-prediction.service.ts
│   ├── usage-forecast.service.ts
│   ├── cost-forecast.service.ts
│   └── monitoring.routes.ts
```

### New Frontend Pages

```
pmo/apps/web/src/pages/monitoring/
├── MonitoringOverviewPage.tsx
├── TenantHealthDashboardPage.tsx
├── InfrastructureDashboardPage.tsx
├── AIUsageDashboardPage.tsx
├── AnomalyManagementPage.tsx
└── AlertConfigurationPage.tsx
```

### Scheduled Jobs

| Job | Frequency | Purpose |
|-----|-----------|---------|
| AI Usage Aggregation | Hourly | Aggregate AIUsageEvent → AIUsageSummary |
| Infrastructure Metrics | Every minute | Collect system metrics |
| Metrics Persistence | Every 5 minutes | Write metrics to database |
| Anomaly Detection (Infra) | Every 5 minutes | Check latency, errors |
| Anomaly Detection (Usage) | Hourly | Check usage patterns |
| Anomaly Detection (Health) | Every 6 hours | Check health trends |
| Baseline Recalculation | Daily | Update rolling baselines |
| Daily Digest | Daily at 8am | Send summary email |
| Churn Prediction | Daily | Update churn risk scores |

### Cost Estimate

| Component | Cost |
|-----------|------|
| PostgreSQL (existing) | $0 |
| Additional storage (~10GB/month) | ~$5-10 |
| Email (SendGrid free tier: 100/day) | $0 |
| Slack webhooks | $0 |
| **Total** | **~$10/month** |

---

## Success Metrics

### Phase 1 (AI Instrumentation)
- 100% of AI tool calls tracked
- Cost allocation accurate within 5%
- < 5ms overhead per tracked call

### Phase 2 (Infrastructure)
- p95 latency visible for all endpoints
- Slow queries > 100ms logged
- Health endpoint responds in < 50ms

### Phase 3 (Anomaly Detection)
- Detection latency < 10 minutes
- False positive rate < 20%
- Zero missed critical anomalies

### Phase 4 (Alerting)
- Alert delivery within 1 minute
- No duplicate alerts (throttling works)
- Daily digest delivery rate 100%

### Phase 5 (Dashboard)
- Dashboard load time < 2 seconds
- Real-time updates every 30 seconds
- Accessible to all admin users

### Phase 6 (Predictions)
- Churn prediction 30+ days in advance
- Forecast accuracy within 25%
- Cost projections updated daily

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| High cardinality metrics | Aggregate by tenant, use time windows |
| Database bloat | Retention policy: 1 year for all data |
| Alert fatigue | Throttling, severity levels, digest mode |
| Performance impact | Async tracking, batch writes, sampling for high-volume |
| False positives | Baseline learning period, manual tuning, false positive feedback |

---

## Configuration Decisions (Confirmed)

1. **Retention Policy**: 1 year for all data (detailed and aggregated)

2. **Alert Recipients**: Bryant.barrington@icloud.com (critical alerts)

3. **AI Cost Thresholds**:
   - Warning: $100/month
   - Critical: $150/month

4. **Dashboard Access**: Admin-only

5. **Baseline Period**: 7-day learning period for anomaly detection

6. **Sampling Rate**: Track 100% of AI calls initially
