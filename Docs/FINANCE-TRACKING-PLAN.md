# Finance Tracking System - Requirements & Implementation Plan

## Executive Summary

This document outlines the requirements and implementation plan for a comprehensive Finance Tracking module for the AI CRM Platform. The module will enable organizations to track customer-associated costs, recurring tech stack expenses, employee costs, and other financial data with AI-powered insights.

**Key Features:**
- Admin-only access with tenant-level role controls
- Multi-category expense and cost tracking
- Budget management with alerts
- Recurring cost tracking (subscriptions, licenses, payroll)
- Customer profitability analysis
- AI-powered expense categorization, anomaly detection, and forecasting

---

## 1. Product Requirements

### 1.1 Core Capabilities

#### 1.1.1 Expense Tracking
| Requirement | Description | Priority |
|-------------|-------------|----------|
| Create/Edit/Delete Expenses | CRUD operations for individual expenses | P0 |
| Expense Categories | Predefined + custom categories (Tech, Payroll, Marketing, Operations, etc.) | P0 |
| Expense Status Workflow | PENDING → APPROVED → PAID or REJECTED | P0 |
| Attachment Support | Upload receipts/invoices (PDF, images) | P1 |
| Bulk Import | CSV/Excel import for historical data | P1 |
| Expense Tagging | Custom tags for filtering and reporting | P2 |

#### 1.1.2 Budget Management
| Requirement | Description | Priority |
|-------------|-------------|----------|
| Create Budgets | Define budgets by category, department, or project | P0 |
| Budget Periods | Support MONTHLY, QUARTERLY, YEARLY periods | P0 |
| Budget vs Actual | Real-time tracking of spend against budget | P0 |
| Budget Alerts | Notifications at configurable thresholds (50%, 75%, 90%, 100%) | P0 |
| Budget Rollover | Option to carry unused budget to next period | P2 |

#### 1.1.3 Recurring Cost Tracking
| Requirement | Description | Priority |
|-------------|-------------|----------|
| Subscription Management | Track SaaS/tech stack subscriptions | P0 |
| License Tracking | Software licenses with seat counts and costs | P0 |
| Employee Costs | Salary, benefits, contractor costs by department | P0 |
| Recurring Schedules | WEEKLY, MONTHLY, QUARTERLY, YEARLY frequencies | P0 |
| Auto-generation | Automatically create expense records from recurring costs | P1 |
| Renewal Alerts | Notify before subscription/license renewals | P1 |

#### 1.1.4 Customer Cost Association
| Requirement | Description | Priority |
|-------------|-------------|----------|
| Account-Level Costs | Associate expenses with CRM Accounts | P0 |
| Project-Level Costs | Track costs by Project | P0 |
| Opportunity Costs | Pre-sale costs associated with Opportunities | P1 |
| Cost Allocation | Split costs across multiple accounts/projects | P1 |
| Profitability Analysis | Revenue vs Cost comparison per account | P0 |

#### 1.1.5 Reporting & Analytics
| Requirement | Description | Priority |
|-------------|-------------|----------|
| Expense Dashboard | Visual overview of spending trends | P0 |
| Category Breakdown | Pie/bar charts by expense category | P0 |
| Time-based Analysis | Monthly/quarterly/yearly trends | P0 |
| Account Profitability | Revenue - Costs per customer | P0 |
| Export Reports | PDF/CSV export capabilities | P1 |
| Custom Date Ranges | Filter all reports by date range | P0 |

### 1.2 Access Control Requirements

#### 1.2.1 Role-Based Access
| Role | Permissions |
|------|-------------|
| **VIEWER** | View expenses, budgets, reports (read-only) |
| **MEMBER** | Create/edit own expenses, view budgets |
| **ADMIN** | Full CRUD on all expenses, manage budgets, approve expenses |
| **OWNER** | All ADMIN permissions + manage finance config, delete budgets |

#### 1.2.2 Admin-Only Features
- Finance module configuration (enable/disable features)
- Budget creation and deletion
- Expense approval workflow
- Recurring cost management
- AI feature configuration
- Report exports

### 1.3 AI-Powered Features

#### 1.3.1 Expense Categorization (AI)
| Feature | Description | Priority |
|---------|-------------|----------|
| Auto-categorization | AI categorizes expenses based on description/vendor | P1 |
| Category Suggestions | Suggest categories during manual entry | P1 |
| Learning System | Improve categorization based on user corrections | P2 |
| Vendor Recognition | Identify vendors from receipt OCR | P2 |

#### 1.3.2 Anomaly Detection (AI)
| Feature | Description | Priority |
|---------|-------------|----------|
| Unusual Spending | Flag expenses significantly above historical average | P1 |
| Duplicate Detection | Identify potential duplicate expenses | P1 |
| Budget Breach Prediction | Predict budget overruns based on trends | P2 |
| Fraud Indicators | Flag suspicious patterns (round numbers, split transactions) | P2 |

#### 1.3.3 Financial Forecasting (AI)
| Feature | Description | Priority |
|---------|-------------|----------|
| Expense Forecasting | Predict future spending based on historical data | P1 |
| Cash Flow Projection | Project cash flow for upcoming periods | P2 |
| Budget Recommendations | AI-suggested budget amounts based on history | P2 |
| Seasonal Adjustments | Account for seasonal spending patterns | P2 |

#### 1.3.4 AI Assistant Features
| Feature | Description | Priority |
|---------|-------------|----------|
| Natural Language Queries | "What did we spend on marketing last quarter?" | P2 |
| Insight Generation | Automated insights and recommendations | P2 |
| Report Narration | AI-generated summaries of financial reports | P2 |

---

## 2. Technical Design

### 2.1 Database Schema

```prisma
// ============================================
// FINANCE TRACKING MODULE MODELS
// ============================================

// Finance module configuration per account
model FinanceConfig {
  id                      Int       @id @default(autoincrement())
  accountId               Int       @unique
  tenantId                String

  // Feature toggles
  enableExpenseTracking   Boolean   @default(true)
  enableBudgetManagement  Boolean   @default(true)
  enableRecurringCosts    Boolean   @default(true)
  enableProfitability     Boolean   @default(true)

  // AI feature toggles
  enableAICategorization  Boolean   @default(false)
  enableAnomalyDetection  Boolean   @default(false)
  enableForecasting       Boolean   @default(false)

  // Alert settings
  budgetAlertThresholds   Json      @default("[50, 75, 90, 100]")
  notifyOnApproval        Boolean   @default(true)

  // Currency settings
  defaultCurrency         String    @default("USD")

  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  account                 Account   @relation(fields: [accountId], references: [id], onDelete: Cascade)
  tenant                  Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
}

// Expense categories (predefined + custom)
model ExpenseCategory {
  id          Int       @id @default(autoincrement())
  tenantId    String
  name        String
  description String?
  color       String    @default("#6B7280")
  icon        String    @default("folder")
  isSystem    Boolean   @default(false)  // true for predefined categories
  isActive    Boolean   @default(true)
  parentId    Int?                        // For sub-categories

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  parent      ExpenseCategory?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    ExpenseCategory[] @relation("CategoryHierarchy")
  expenses    Expense[]
  budgets     Budget[]
  recurringCosts RecurringCost[]

  @@unique([tenantId, name])
  @@index([tenantId, isActive])
}

// Budget definitions
model Budget {
  id              Int       @id @default(autoincrement())
  tenantId        String
  accountId       Int?                    // Optional: budget for specific account
  projectId       Int?                    // Optional: budget for specific project
  categoryId      Int?                    // Optional: budget for specific category

  name            String
  description     String?
  amount          Decimal   @db.Decimal(15, 2)
  spent           Decimal   @db.Decimal(15, 2) @default(0)
  currency        String    @default("USD")

  period          BudgetPeriod
  startDate       DateTime
  endDate         DateTime?

  // Alert configuration
  alertThresholds Json      @default("[50, 75, 90, 100]")
  lastAlertLevel  Int?                    // Track last alert sent

  // Rollover settings
  allowRollover   Boolean   @default(false)
  rolloverAmount  Decimal   @db.Decimal(15, 2) @default(0)

  status          BudgetStatus @default(ACTIVE)
  ownerId         Int

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  tenant          Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  account         Account?  @relation(fields: [accountId], references: [id], onDelete: SetNull)
  project         Project?  @relation(fields: [projectId], references: [id], onDelete: SetNull)
  category        ExpenseCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  owner           User      @relation(fields: [ownerId], references: [id])
  expenses        Expense[]

  @@index([tenantId, status])
  @@index([tenantId, accountId])
  @@index([tenantId, categoryId])
}

enum BudgetPeriod {
  WEEKLY
  MONTHLY
  QUARTERLY
  YEARLY
  CUSTOM
}

enum BudgetStatus {
  DRAFT
  ACTIVE
  PAUSED
  CLOSED
}

// Individual expense records
model Expense {
  id              Int       @id @default(autoincrement())
  tenantId        String

  // Associations
  accountId       Int?
  projectId       Int?
  opportunityId   Int?
  budgetId        Int?
  categoryId      Int
  recurringCostId Int?      // If generated from recurring cost

  // Expense details
  description     String
  amount          Decimal   @db.Decimal(15, 2)
  currency        String    @default("USD")
  date            DateTime

  // Vendor information
  vendorName      String?
  vendorId        String?   // External vendor ID
  invoiceNumber   String?

  // Status workflow
  status          ExpenseStatus @default(PENDING)
  approvedBy      Int?
  approvedAt      DateTime?
  rejectionReason String?

  // Attachments
  attachments     Json      @default("[]")  // Array of {url, filename, type}

  // AI-generated fields
  aiCategorySuggestion    String?
  aiConfidenceScore       Float?
  aiAnomalyFlag           Boolean   @default(false)
  aiAnomalyReason         String?

  // Tags and notes
  tags            String[]  @default([])
  notes           String?

  // Cost allocation (for split expenses)
  allocations     Json?     // [{accountId, projectId, percentage, amount}]

  ownerId         Int
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  tenant          Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  account         Account?  @relation(fields: [accountId], references: [id], onDelete: SetNull)
  project         Project?  @relation(fields: [projectId], references: [id], onDelete: SetNull)
  opportunity     Opportunity? @relation(fields: [opportunityId], references: [id], onDelete: SetNull)
  budget          Budget?   @relation(fields: [budgetId], references: [id], onDelete: SetNull)
  category        ExpenseCategory @relation(fields: [categoryId], references: [id])
  recurringCost   RecurringCost? @relation(fields: [recurringCostId], references: [id], onDelete: SetNull)
  owner           User      @relation(fields: [ownerId], references: [id])
  approver        User?     @relation("ExpenseApprover", fields: [approvedBy], references: [id])

  @@index([tenantId, status])
  @@index([tenantId, accountId])
  @@index([tenantId, categoryId])
  @@index([tenantId, date])
}

enum ExpenseStatus {
  DRAFT
  PENDING
  APPROVED
  REJECTED
  PAID
  CANCELLED
}

// Recurring costs (subscriptions, licenses, payroll)
model RecurringCost {
  id              Int       @id @default(autoincrement())
  tenantId        String

  // Associations
  accountId       Int?
  categoryId      Int

  name            String
  description     String?

  // Cost type
  type            RecurringCostType

  // Amount and frequency
  amount          Decimal   @db.Decimal(15, 2)
  currency        String    @default("USD")
  frequency       RecurringFrequency

  // Billing details
  billingDay      Int?      // Day of month for monthly
  startDate       DateTime
  endDate         DateTime?
  nextDueDate     DateTime

  // For subscriptions/licenses
  vendorName      String?
  vendorUrl       String?
  contractNumber  String?
  seatCount       Int?
  costPerSeat     Decimal?  @db.Decimal(15, 2)

  // For employee costs
  employeeId      Int?
  department      String?

  // Renewal settings
  autoRenew       Boolean   @default(true)
  renewalAlertDays Int      @default(30)

  status          RecurringCostStatus @default(ACTIVE)
  ownerId         Int

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  tenant          Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  account         Account?  @relation(fields: [accountId], references: [id], onDelete: SetNull)
  category        ExpenseCategory @relation(fields: [categoryId], references: [id])
  employee        User?     @relation("EmployeeCost", fields: [employeeId], references: [id])
  owner           User      @relation("RecurringCostOwner", fields: [ownerId], references: [id])
  expenses        Expense[] // Generated expenses

  @@index([tenantId, status])
  @@index([tenantId, type])
  @@index([tenantId, nextDueDate])
}

enum RecurringCostType {
  SUBSCRIPTION    // SaaS, cloud services
  LICENSE         // Software licenses
  PAYROLL         // Employee salary/wages
  BENEFITS        // Employee benefits
  CONTRACTOR      // Contractor/freelancer
  RENT            // Office rent
  UTILITIES       // Utilities (electric, internet)
  INSURANCE       // Business insurance
  MAINTENANCE     // Maintenance contracts
  OTHER
}

enum RecurringFrequency {
  WEEKLY
  BIWEEKLY
  MONTHLY
  QUARTERLY
  SEMIANNUALLY
  YEARLY
}

enum RecurringCostStatus {
  DRAFT
  ACTIVE
  PAUSED
  CANCELLED
  EXPIRED
}

// Profitability snapshots for accounts
model AccountProfitability {
  id              Int       @id @default(autoincrement())
  tenantId        String
  accountId       Int

  // Period
  period          String    // Format: "2025-Q1", "2025-01"
  periodType      ProfitabilityPeriod
  startDate       DateTime
  endDate         DateTime

  // Revenue data
  totalRevenue    Decimal   @db.Decimal(15, 2) @default(0)
  recognizedRevenue Decimal @db.Decimal(15, 2) @default(0)

  // Cost data
  directCosts     Decimal   @db.Decimal(15, 2) @default(0)
  allocatedCosts  Decimal   @db.Decimal(15, 2) @default(0)
  totalCosts      Decimal   @db.Decimal(15, 2) @default(0)

  // Profitability metrics
  grossProfit     Decimal   @db.Decimal(15, 2) @default(0)
  grossMargin     Float     @default(0)
  netProfit       Decimal   @db.Decimal(15, 2) @default(0)
  netMargin       Float     @default(0)

  // Cost breakdown
  costBreakdown   Json      @default("{}")  // {category: amount}

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  tenant          Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  account         Account   @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@unique([tenantId, accountId, period])
  @@index([tenantId, accountId])
  @@index([tenantId, periodType])
}

enum ProfitabilityPeriod {
  MONTHLY
  QUARTERLY
  YEARLY
}

// Finance alerts and notifications
model FinanceAlert {
  id              Int       @id @default(autoincrement())
  tenantId        String

  type            FinanceAlertType
  severity        AlertSeverity @default(INFO)

  title           String
  message         String

  // Related entities
  budgetId        Int?
  expenseId       Int?
  recurringCostId Int?
  accountId       Int?

  // Metadata
  metadata        Json      @default("{}")

  // Status
  isRead          Boolean   @default(false)
  isDismissed     Boolean   @default(false)

  // Recipient
  userId          Int

  createdAt       DateTime  @default(now())
  readAt          DateTime?

  tenant          Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  budget          Budget?   @relation(fields: [budgetId], references: [id], onDelete: SetNull)

  @@index([tenantId, userId, isRead])
  @@index([tenantId, type])
}

enum FinanceAlertType {
  BUDGET_THRESHOLD
  BUDGET_EXCEEDED
  EXPENSE_PENDING_APPROVAL
  EXPENSE_APPROVED
  EXPENSE_REJECTED
  RENEWAL_UPCOMING
  RENEWAL_OVERDUE
  ANOMALY_DETECTED
  FORECAST_WARNING
}

enum AlertSeverity {
  INFO
  WARNING
  CRITICAL
}

// AI-generated financial insights
model FinanceInsight {
  id              Int       @id @default(autoincrement())
  tenantId        String
  accountId       Int?

  type            InsightType
  title           String
  description     String    @db.Text

  // Insight data
  metrics         Json      @default("{}")
  recommendations Json      @default("[]")

  // Confidence and validity
  confidence      Float     @default(0)
  validFrom       DateTime
  validUntil      DateTime

  // Status
  isActive        Boolean   @default(true)
  isDismissed     Boolean   @default(false)
  isActedUpon     Boolean   @default(false)

  createdAt       DateTime  @default(now())

  tenant          Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  account         Account?  @relation(fields: [accountId], references: [id], onDelete: SetNull)

  @@index([tenantId, type, isActive])
}

enum InsightType {
  SPENDING_TREND
  COST_OPTIMIZATION
  BUDGET_RECOMMENDATION
  ANOMALY_INSIGHT
  FORECAST
  PROFITABILITY
}
```

### 2.2 API Design

#### 2.2.1 Expense Endpoints
```
POST   /api/finance/expenses                    - Create expense
GET    /api/finance/expenses                    - List expenses (with filters)
GET    /api/finance/expenses/:id                - Get expense details
PUT    /api/finance/expenses/:id                - Update expense
DELETE /api/finance/expenses/:id                - Delete expense
POST   /api/finance/expenses/:id/approve        - Approve expense (admin)
POST   /api/finance/expenses/:id/reject         - Reject expense (admin)
POST   /api/finance/expenses/bulk-import        - Bulk import from CSV
GET    /api/finance/expenses/export             - Export to CSV/PDF
```

#### 2.2.2 Budget Endpoints
```
POST   /api/finance/budgets                     - Create budget (admin)
GET    /api/finance/budgets                     - List budgets
GET    /api/finance/budgets/:id                 - Get budget details
PUT    /api/finance/budgets/:id                 - Update budget (admin)
DELETE /api/finance/budgets/:id                 - Delete budget (admin)
GET    /api/finance/budgets/:id/expenses        - Get expenses for budget
GET    /api/finance/budgets/:id/forecast        - Get AI budget forecast
```

#### 2.2.3 Recurring Cost Endpoints
```
POST   /api/finance/recurring-costs             - Create recurring cost (admin)
GET    /api/finance/recurring-costs             - List recurring costs
GET    /api/finance/recurring-costs/:id         - Get recurring cost details
PUT    /api/finance/recurring-costs/:id         - Update recurring cost (admin)
DELETE /api/finance/recurring-costs/:id         - Delete recurring cost (admin)
POST   /api/finance/recurring-costs/:id/generate - Generate expense from recurring
GET    /api/finance/recurring-costs/upcoming    - Get upcoming renewals
```

#### 2.2.4 Category Endpoints
```
POST   /api/finance/categories                  - Create category (admin)
GET    /api/finance/categories                  - List categories
PUT    /api/finance/categories/:id              - Update category (admin)
DELETE /api/finance/categories/:id              - Delete category (admin)
```

#### 2.2.5 Analytics & Reports Endpoints
```
GET    /api/finance/analytics/overview          - Dashboard overview
GET    /api/finance/analytics/by-category       - Spending by category
GET    /api/finance/analytics/by-account        - Spending by account
GET    /api/finance/analytics/trends            - Spending trends over time
GET    /api/finance/analytics/profitability     - Account profitability
GET    /api/finance/analytics/forecast          - AI spending forecast
```

#### 2.2.6 AI Endpoints
```
POST   /api/finance/ai/categorize               - AI categorize expense
POST   /api/finance/ai/detect-anomalies         - Run anomaly detection
GET    /api/finance/ai/insights                 - Get AI-generated insights
POST   /api/finance/ai/forecast                 - Generate financial forecast
POST   /api/finance/ai/query                    - Natural language query
```

#### 2.2.7 Config & Alerts Endpoints
```
GET    /api/finance/config                      - Get finance config
PUT    /api/finance/config                      - Update finance config (admin)
GET    /api/finance/alerts                      - List user alerts
PUT    /api/finance/alerts/:id/read             - Mark alert as read
PUT    /api/finance/alerts/:id/dismiss          - Dismiss alert
```

### 2.3 Module Structure

```
pmo/apps/api/src/modules/finance-tracking/
├── index.ts                              # Module exports
├── finance.router.ts                     # Main router combining all routes
├── routes/
│   ├── expense.routes.ts                 # Expense CRUD routes
│   ├── budget.routes.ts                  # Budget routes
│   ├── recurring-cost.routes.ts          # Recurring cost routes
│   ├── category.routes.ts                # Category routes
│   ├── analytics.routes.ts               # Analytics/reports routes
│   ├── ai.routes.ts                      # AI feature routes
│   └── config.routes.ts                  # Config and alerts routes
├── services/
│   ├── expense.service.ts                # Expense business logic
│   ├── budget.service.ts                 # Budget management
│   ├── recurring-cost.service.ts         # Recurring cost logic
│   ├── category.service.ts               # Category management
│   ├── analytics.service.ts              # Analytics calculations
│   ├── profitability.service.ts          # Account profitability
│   └── alert.service.ts                  # Alert generation
├── ai/
│   ├── categorization.service.ts         # AI expense categorization
│   ├── anomaly-detection.service.ts      # Anomaly detection
│   ├── forecasting.service.ts            # Financial forecasting
│   └── insights.service.ts               # AI insight generation
├── jobs/
│   ├── recurring-expense-generator.ts    # Generate expenses from recurring
│   ├── budget-alert-checker.ts           # Check and send budget alerts
│   ├── profitability-calculator.ts       # Calculate period profitability
│   └── renewal-reminder.ts               # Send renewal reminders
└── types.ts                              # TypeScript interfaces

pmo/apps/api/src/validation/
└── finance/
    ├── expense.schema.ts                 # Expense validation
    ├── budget.schema.ts                  # Budget validation
    ├── recurring-cost.schema.ts          # Recurring cost validation
    └── category.schema.ts                # Category validation

pmo/apps/web/src/pages/finance/
├── FinanceDashboardPage.tsx              # Main dashboard
├── ExpensesPage.tsx                      # Expense list and management
├── ExpenseDetailPage.tsx                 # Single expense view
├── BudgetsPage.tsx                       # Budget management
├── BudgetDetailPage.tsx                  # Single budget view
├── RecurringCostsPage.tsx                # Recurring costs management
├── ProfitabilityPage.tsx                 # Account profitability
├── ReportsPage.tsx                       # Reports and exports
└── FinanceSettingsPage.tsx               # Module configuration

pmo/apps/web/src/api/
└── finance/
    ├── expenses.ts                       # Expense API calls
    ├── budgets.ts                        # Budget API calls
    ├── recurring-costs.ts                # Recurring cost API calls
    ├── analytics.ts                      # Analytics API calls
    └── hooks/
        ├── useExpenses.ts                # Expense React Query hooks
        ├── useBudgets.ts                 # Budget hooks
        ├── useRecurringCosts.ts          # Recurring cost hooks
        └── useFinanceAnalytics.ts        # Analytics hooks
```

---

## 3. Implementation Plan

### Phase 1: Foundation (Weeks 1-2)

#### 3.1.1 Database Setup
- [ ] Add Prisma models for finance tracking
- [ ] Create migration
- [ ] Add seed data for expense categories
- [ ] Update existing Account, Project models with relations

#### 3.1.2 Core Backend Setup
- [ ] Create module structure in `modules/finance-tracking/`
- [ ] Implement expense CRUD service and routes
- [ ] Implement category CRUD service and routes
- [ ] Add validation schemas
- [ ] Register module in `app.ts` with module guard
- [ ] Add `financeTracking` to module config

#### 3.1.3 Basic Frontend
- [ ] Create Finance pages directory structure
- [ ] Implement FinanceDashboardPage (basic)
- [ ] Implement ExpensesPage with list view
- [ ] Implement expense create/edit forms
- [ ] Add navigation routes and sidebar links
- [ ] Create API client functions and React Query hooks

### Phase 2: Budget & Recurring Costs (Weeks 3-4)

#### 3.2.1 Budget Management
- [ ] Implement budget service and routes
- [ ] Create BudgetsPage with list view
- [ ] Implement budget create/edit forms
- [ ] Add budget vs actual tracking
- [ ] Implement budget alert service

#### 3.2.2 Recurring Costs
- [ ] Implement recurring cost service and routes
- [ ] Create RecurringCostsPage
- [ ] Implement recurring cost forms
- [ ] Create expense generation job
- [ ] Add renewal alert functionality

#### 3.2.3 Admin Controls
- [ ] Implement role-based access control
- [ ] Add expense approval workflow UI
- [ ] Create admin configuration page

### Phase 3: Analytics & Reporting (Weeks 5-6)

#### 3.3.1 Analytics Backend
- [ ] Implement analytics service
- [ ] Create profitability calculation service
- [ ] Add date-range filtering
- [ ] Implement data aggregation functions

#### 3.3.2 Dashboard & Reports
- [ ] Enhance dashboard with charts
- [ ] Implement spending trends visualization
- [ ] Add category breakdown charts
- [ ] Create account profitability reports
- [ ] Implement CSV/PDF export

### Phase 4: AI Integration (Weeks 7-8)

#### 3.4.1 AI Categorization
- [ ] Implement AI categorization service
- [ ] Add category suggestion in expense form
- [ ] Create learning feedback loop

#### 3.4.2 Anomaly Detection
- [ ] Implement anomaly detection service
- [ ] Add anomaly flags to expense list
- [ ] Create anomaly alerts

#### 3.4.3 Forecasting
- [ ] Implement forecasting service
- [ ] Add forecast visualization to dashboard
- [ ] Create budget recommendation engine

### Phase 5: Polish & Testing (Weeks 9-10)

#### 3.5.1 Testing
- [ ] Write unit tests for services
- [ ] Write API integration tests
- [ ] Create E2E tests for critical flows
- [ ] Performance testing for analytics

#### 3.5.2 Documentation & Polish
- [ ] Update CLAUDE.md with finance module docs
- [ ] Create user documentation
- [ ] UI polish and accessibility
- [ ] Error handling improvements

---

## 4. AI Integration Details

### 4.1 Expense Categorization AI

**Implementation Approach:**
1. Use OpenAI GPT-4 for initial categorization
2. Build training data from user corrections
3. Implement confidence scoring

**Prompt Template:**
```typescript
const categorizationPrompt = `
You are a financial categorization assistant. Given an expense description and optional vendor name, categorize it into one of these categories:
${categories.map(c => `- ${c.name}: ${c.description}`).join('\n')}

Expense: {description}
Vendor: {vendorName}

Respond with JSON:
{
  "category": "category_name",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}
`;
```

### 4.2 Anomaly Detection AI

**Detection Methods:**
1. **Statistical Anomalies**: Expenses > 2 standard deviations from category average
2. **Pattern Detection**: Unusual timing, frequency, or vendor patterns
3. **Duplicate Detection**: Similar amounts/vendors within short timeframes

**AI-Assisted Analysis:**
```typescript
const anomalyPrompt = `
Analyze this expense for potential anomalies:
- Amount: ${expense.amount}
- Category: ${expense.category}
- Historical average for category: ${avgAmount}
- Standard deviation: ${stdDev}
- Vendor: ${expense.vendorName}
- Date: ${expense.date}

Recent similar expenses:
${recentExpenses.map(e => `- ${e.date}: ${e.amount} from ${e.vendorName}`).join('\n')}

Identify any anomalies and explain why.
`;
```

### 4.3 Financial Forecasting AI

**Forecasting Approach:**
1. Historical trend analysis using time series
2. Seasonal adjustment detection
3. AI interpretation of trends and external factors

**Forecast Output:**
```typescript
interface Forecast {
  period: string;
  predictedSpend: number;
  confidenceInterval: { low: number; high: number };
  assumptions: string[];
  risks: string[];
}
```

---

## 5. Security Considerations

### 5.1 Access Control
- All finance routes require authentication
- Admin routes require tenant ADMIN or OWNER role
- Expense approval requires different user than creator
- Sensitive data (amounts) should be encrypted at rest

### 5.2 Audit Trail
- Log all expense approvals/rejections
- Track budget changes with history
- Maintain immutable expense history

### 5.3 Data Validation
- Validate currency codes
- Prevent negative amounts (except credits)
- Validate date ranges for budgets
- Sanitize imported CSV data

---

## 6. Integration Points

### 6.1 CRM Integration
- Link expenses to Accounts
- Link expenses to Opportunities (pre-sale costs)
- Display costs in Account detail page
- Show profitability in Account list

### 6.2 Project Integration
- Link expenses to Projects
- Track project-level costs
- Budget by project support

### 6.3 User Integration
- Track employee costs by User
- Expense ownership and approval
- Dashboard personalization

### 6.4 Notification Integration
- Budget threshold alerts
- Expense approval notifications
- Renewal reminders
- Anomaly alerts

---

## 7. Default Categories (Seed Data)

```typescript
const defaultCategories = [
  // Tech Stack
  { name: 'Cloud Infrastructure', icon: 'cloud', color: '#3B82F6' },
  { name: 'Software Licenses', icon: 'key', color: '#8B5CF6' },
  { name: 'SaaS Subscriptions', icon: 'package', color: '#EC4899' },
  { name: 'Development Tools', icon: 'code', color: '#10B981' },
  { name: 'Hosting & Domains', icon: 'globe', color: '#F59E0B' },

  // Personnel
  { name: 'Salaries & Wages', icon: 'users', color: '#6366F1' },
  { name: 'Employee Benefits', icon: 'heart', color: '#EF4444' },
  { name: 'Contractors', icon: 'briefcase', color: '#14B8A6' },
  { name: 'Training & Education', icon: 'graduation-cap', color: '#F97316' },

  // Operations
  { name: 'Office Rent', icon: 'building', color: '#64748B' },
  { name: 'Utilities', icon: 'zap', color: '#FBBF24' },
  { name: 'Equipment', icon: 'monitor', color: '#84CC16' },
  { name: 'Travel', icon: 'plane', color: '#06B6D4' },
  { name: 'Meals & Entertainment', icon: 'utensils', color: '#F43F5E' },

  // Business
  { name: 'Marketing', icon: 'megaphone', color: '#A855F7' },
  { name: 'Sales', icon: 'trending-up', color: '#22C55E' },
  { name: 'Legal', icon: 'scale', color: '#6B7280' },
  { name: 'Insurance', icon: 'shield', color: '#0EA5E9' },
  { name: 'Professional Services', icon: 'briefcase', color: '#D946EF' },

  // Customer
  { name: 'Customer Delivery', icon: 'truck', color: '#2563EB' },
  { name: 'Customer Support', icon: 'headphones', color: '#7C3AED' },
  { name: 'Customer Success', icon: 'star', color: '#FACC15' },

  // Other
  { name: 'Miscellaneous', icon: 'folder', color: '#9CA3AF' },
];
```

---

## 8. Success Metrics

### 8.1 Adoption Metrics
- Number of expenses tracked per month
- Number of budgets created
- Recurring cost coverage
- User engagement (daily/weekly active users)

### 8.2 Quality Metrics
- AI categorization accuracy (target: >85%)
- Anomaly detection precision (target: >90%)
- Budget forecast accuracy (target: ±10%)

### 8.3 Business Metrics
- Time saved on expense tracking
- Budget compliance improvement
- Cost optimization identified

---

## 9. Future Enhancements

### 9.1 Planned
- Invoice OCR scanning
- Bank account integration
- Multi-currency support with conversion
- Approval workflow customization
- Mobile expense capture

### 9.2 Potential
- Credit card integration
- Vendor management portal
- Contract management
- Tax reporting
- Accounts receivable tracking
