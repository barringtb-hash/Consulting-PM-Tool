-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecurringCostType" AS ENUM ('SUBSCRIPTION', 'LICENSE', 'PAYROLL', 'BENEFITS', 'CONTRACTOR', 'RENT', 'UTILITIES', 'INSURANCE', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RecurringCostStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProfitabilityPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "FinanceAlertType" AS ENUM ('BUDGET_THRESHOLD', 'BUDGET_EXCEEDED', 'EXPENSE_PENDING_APPROVAL', 'EXPENSE_APPROVED', 'EXPENSE_REJECTED', 'RENEWAL_UPCOMING', 'RENEWAL_OVERDUE', 'ANOMALY_DETECTED', 'FORECAST_WARNING');

-- CreateEnum
CREATE TYPE "FinanceAlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FinanceInsightType" AS ENUM ('SPENDING_TREND', 'COST_OPTIMIZATION', 'BUDGET_RECOMMENDATION', 'ANOMALY_INSIGHT', 'FORECAST', 'PROFITABILITY');

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "icon" TEXT NOT NULL DEFAULT 'folder',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" INTEGER,
    "projectId" INTEGER,
    "categoryId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "spent" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "period" "BudgetPeriod" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "alertThresholds" JSONB NOT NULL DEFAULT '[50, 75, 90, 100]',
    "lastAlertLevel" INTEGER,
    "allowRollover" BOOLEAN NOT NULL DEFAULT false,
    "rolloverAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "BudgetStatus" NOT NULL DEFAULT 'ACTIVE',
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" INTEGER,
    "projectId" INTEGER,
    "opportunityId" INTEGER,
    "budgetId" INTEGER,
    "categoryId" INTEGER NOT NULL,
    "recurringCostId" INTEGER,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "date" TIMESTAMP(3) NOT NULL,
    "vendorName" TEXT,
    "vendorId" TEXT,
    "invoiceNumber" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "aiCategorySuggestion" TEXT,
    "aiConfidenceScore" DOUBLE PRECISION,
    "aiAnomalyFlag" BOOLEAN NOT NULL DEFAULT false,
    "aiAnomalyReason" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "allocations" JSONB,
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringCost" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" INTEGER,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "RecurringCostType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "frequency" "RecurringFrequency" NOT NULL,
    "billingDay" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "vendorName" TEXT,
    "vendorUrl" TEXT,
    "contractNumber" TEXT,
    "seatCount" INTEGER,
    "costPerSeat" DECIMAL(15,2),
    "employeeId" INTEGER,
    "department" TEXT,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "renewalAlertDays" INTEGER NOT NULL DEFAULT 30,
    "status" "RecurringCostStatus" NOT NULL DEFAULT 'ACTIVE',
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountProfitability" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "periodType" "ProfitabilityPeriod" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalRevenue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "recognizedRevenue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "directCosts" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "allocatedCosts" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalCosts" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "grossProfit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "grossMargin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netProfit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "netMargin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costBreakdown" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountProfitability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceAlert" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "FinanceAlertType" NOT NULL,
    "severity" "FinanceAlertSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "budgetId" INTEGER,
    "expenseId" INTEGER,
    "recurringCostId" INTEGER,
    "accountId" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "FinanceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceInsight" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" INTEGER,
    "type" "FinanceInsightType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "recommendations" JSONB NOT NULL DEFAULT '[]',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "isActedUpon" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseCategory_tenantId_isActive_idx" ON "ExpenseCategory"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_tenantId_name_key" ON "ExpenseCategory"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Budget_tenantId_status_idx" ON "Budget"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Budget_tenantId_accountId_idx" ON "Budget"("tenantId", "accountId");

-- CreateIndex
CREATE INDEX "Budget_tenantId_categoryId_idx" ON "Budget"("tenantId", "categoryId");

-- CreateIndex
CREATE INDEX "Expense_tenantId_status_idx" ON "Expense"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Expense_tenantId_accountId_idx" ON "Expense"("tenantId", "accountId");

-- CreateIndex
CREATE INDEX "Expense_tenantId_categoryId_idx" ON "Expense"("tenantId", "categoryId");

-- CreateIndex
CREATE INDEX "Expense_tenantId_date_idx" ON "Expense"("tenantId", "date");

-- CreateIndex
CREATE INDEX "RecurringCost_tenantId_status_idx" ON "RecurringCost"("tenantId", "status");

-- CreateIndex
CREATE INDEX "RecurringCost_tenantId_type_idx" ON "RecurringCost"("tenantId", "type");

-- CreateIndex
CREATE INDEX "RecurringCost_tenantId_nextDueDate_idx" ON "RecurringCost"("tenantId", "nextDueDate");

-- CreateIndex
CREATE INDEX "AccountProfitability_tenantId_accountId_idx" ON "AccountProfitability"("tenantId", "accountId");

-- CreateIndex
CREATE INDEX "AccountProfitability_tenantId_periodType_idx" ON "AccountProfitability"("tenantId", "periodType");

-- CreateIndex
CREATE UNIQUE INDEX "AccountProfitability_tenantId_accountId_period_key" ON "AccountProfitability"("tenantId", "accountId", "period");

-- CreateIndex
CREATE INDEX "FinanceAlert_tenantId_userId_isRead_idx" ON "FinanceAlert"("tenantId", "userId", "isRead");

-- CreateIndex
CREATE INDEX "FinanceAlert_tenantId_type_idx" ON "FinanceAlert"("tenantId", "type");

-- CreateIndex
CREATE INDEX "FinanceInsight_tenantId_type_isActive_idx" ON "FinanceInsight"("tenantId", "type", "isActive");

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recurringCostId_fkey" FOREIGN KEY ("recurringCostId") REFERENCES "RecurringCost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringCost" ADD CONSTRAINT "RecurringCost_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringCost" ADD CONSTRAINT "RecurringCost_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringCost" ADD CONSTRAINT "RecurringCost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringCost" ADD CONSTRAINT "RecurringCost_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringCost" ADD CONSTRAINT "RecurringCost_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountProfitability" ADD CONSTRAINT "AccountProfitability_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountProfitability" ADD CONSTRAINT "AccountProfitability_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAlert" ADD CONSTRAINT "FinanceAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAlert" ADD CONSTRAINT "FinanceAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAlert" ADD CONSTRAINT "FinanceAlert_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceInsight" ADD CONSTRAINT "FinanceInsight_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceInsight" ADD CONSTRAINT "FinanceInsight_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
