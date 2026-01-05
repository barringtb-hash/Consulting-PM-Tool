-- Phase 3 AI Tools Migration
-- Creates all tables for: Inventory Forecasting, Compliance Monitor,
-- Predictive Maintenance, Revenue Management, Safety Monitor
-- Total: 46 tables, 16 enums

-- ============================================================================
-- PART 1: ENUMS
-- ============================================================================

-- Inventory Forecasting Enums
CREATE TYPE "ForecastStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'NEEDS_REVIEW');
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- Compliance Monitor Enums
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "ViolationStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'REMEDIATED', 'RESOLVED', 'ESCALATED', 'CLOSED', 'FALSE_POSITIVE');
CREATE TYPE "AuditStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- Predictive Maintenance Enums
CREATE TYPE "EquipmentStatus" AS ENUM ('OPERATIONAL', 'DEGRADED', 'WARNING', 'CRITICAL', 'OFFLINE', 'MAINTENANCE');
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE', 'EMERGENCY');
CREATE TYPE "WorkOrderStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
CREATE TYPE "WorkOrderPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- Revenue Management Enums
CREATE TYPE "PricingStrategy" AS ENUM ('STATIC', 'DYNAMIC', 'COMPETITIVE', 'DEMAND_BASED', 'TIME_BASED');
CREATE TYPE "RateType" AS ENUM ('STANDARD', 'PROMOTIONAL', 'LAST_MINUTE', 'EARLY_BIRD', 'PACKAGE');

-- Safety Monitor Enums
CREATE TYPE "IncidentSeverity" AS ENUM ('NEAR_MISS', 'MINOR', 'MODERATE', 'SERIOUS', 'SEVERE', 'FATAL');
CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'UNDER_INVESTIGATION', 'ROOT_CAUSE_IDENTIFIED', 'CORRECTIVE_ACTION_PENDING', 'CORRECTIVE_ACTION_COMPLETE', 'CLOSED');
CREATE TYPE "ChecklistStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'SKIPPED');
CREATE TYPE "TrainingStatus" AS ENUM ('NOT_ASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'FAILED');

-- ============================================================================
-- PART 2: TOOL 3.1 - INVENTORY FORECASTING (9 tables)
-- ============================================================================

-- InventoryForecastConfig
CREATE TABLE "InventoryForecastConfig" (
    "id" SERIAL PRIMARY KEY,
    "tenantId" TEXT,
    "clientId" INTEGER UNIQUE,
    "accountId" INTEGER UNIQUE,
    "businessName" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "forecastHorizonDays" INTEGER NOT NULL DEFAULT 90,
    "historicalDataMonths" INTEGER NOT NULL DEFAULT 24,
    "confidenceLevel" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
    "enableSeasonality" BOOLEAN NOT NULL DEFAULT true,
    "enableTrendDetection" BOOLEAN NOT NULL DEFAULT true,
    "enableHolidayImpact" BOOLEAN NOT NULL DEFAULT true,
    "modelType" TEXT NOT NULL DEFAULT 'prophet',
    "lowStockThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "overstockThreshold" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "erpSystem" TEXT,
    "erpCredentials" JSONB,
    "posSystem" TEXT,
    "posCredentials" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "InventoryForecastConfig_tenantId_isActive_idx" ON "InventoryForecastConfig"("tenantId", "isActive");
CREATE INDEX "InventoryForecastConfig_clientId_isActive_idx" ON "InventoryForecastConfig"("clientId", "isActive");
CREATE INDEX "InventoryForecastConfig_accountId_isActive_idx" ON "InventoryForecastConfig"("accountId", "isActive");

-- InventoryLocation
CREATE TABLE "InventoryLocation" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address" JSONB,
    "timezone" TEXT,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 7,
    "safetyStockDays" INTEGER NOT NULL DEFAULT 14,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryLocation_configId_fkey" FOREIGN KEY ("configId") REFERENCES "InventoryForecastConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InventoryLocation_configId_code_key" ON "InventoryLocation"("configId", "code");
CREATE INDEX "InventoryLocation_configId_isActive_idx" ON "InventoryLocation"("configId", "isActive");

-- InventoryProduct
CREATE TABLE "InventoryProduct" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "subcategory" TEXT,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "supplierLeadTimeDays" INTEGER,
    "unitCost" DECIMAL(12,2),
    "sellingPrice" DECIMAL(12,2),
    "reorderPoint" INTEGER,
    "reorderQuantity" INTEGER,
    "minOrderQuantity" INTEGER,
    "abcClass" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryProduct_configId_fkey" FOREIGN KEY ("configId") REFERENCES "InventoryForecastConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InventoryProduct_configId_sku_key" ON "InventoryProduct"("configId", "sku");
CREATE INDEX "InventoryProduct_configId_category_idx" ON "InventoryProduct"("configId", "category");
CREATE INDEX "InventoryProduct_configId_isActive_idx" ON "InventoryProduct"("configId", "isActive");

-- StockLevel
CREATE TABLE "StockLevel" (
    "id" SERIAL PRIMARY KEY,
    "productId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "quantityReserved" INTEGER NOT NULL DEFAULT 0,
    "quantityOnOrder" INTEGER NOT NULL DEFAULT 0,
    "lastCountDate" TIMESTAMP(3),
    "lastReceivedDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StockLevel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "InventoryProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockLevel_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StockLevel_productId_locationId_key" ON "StockLevel"("productId", "locationId");
CREATE INDEX "StockLevel_productId_idx" ON "StockLevel"("productId");
CREATE INDEX "StockLevel_locationId_idx" ON "StockLevel"("locationId");

-- SalesHistory
CREATE TABLE "SalesHistory" (
    "id" SERIAL PRIMARY KEY,
    "productId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "quantitySold" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2),
    "locationId" INTEGER,
    "wasPromotion" BOOLEAN NOT NULL DEFAULT false,
    "wasHoliday" BOOLEAN NOT NULL DEFAULT false,
    "weatherCondition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "InventoryProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SalesHistory_productId_date_locationId_key" ON "SalesHistory"("productId", "date", "locationId");
CREATE INDEX "SalesHistory_productId_date_idx" ON "SalesHistory"("productId", "date" DESC);

-- InventoryForecast
CREATE TABLE "InventoryForecast" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "locationId" INTEGER,
    "status" "ForecastStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3),
    "predictions" JSONB,
    "totalPredictedDemand" INTEGER,
    "peakDemandDate" TIMESTAMP(3),
    "peakDemandValue" INTEGER,
    "mape" DOUBLE PRECISION,
    "rmse" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "suggestedReorderDate" TIMESTAMP(3),
    "suggestedReorderQty" INTEGER,
    "stockoutRiskScore" DOUBLE PRECISION,
    "seasonalityPattern" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryForecast_configId_fkey" FOREIGN KEY ("configId") REFERENCES "InventoryForecastConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryForecast_productId_fkey" FOREIGN KEY ("productId") REFERENCES "InventoryProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryForecast_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "InventoryForecast_configId_status_idx" ON "InventoryForecast"("configId", "status");
CREATE INDEX "InventoryForecast_productId_startDate_idx" ON "InventoryForecast"("productId", "startDate");
CREATE INDEX "InventoryForecast_generatedAt_idx" ON "InventoryForecast"("generatedAt" DESC);

-- InventoryAlert
CREATE TABLE "InventoryAlert" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "productId" INTEGER,
    "locationId" INTEGER,
    "threshold" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryAlert_configId_fkey" FOREIGN KEY ("configId") REFERENCES "InventoryForecastConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "InventoryAlert_configId_status_idx" ON "InventoryAlert"("configId", "status");
CREATE INDEX "InventoryAlert_configId_severity_idx" ON "InventoryAlert"("configId", "severity");
CREATE INDEX "InventoryAlert_createdAt_idx" ON "InventoryAlert"("createdAt" DESC);

-- ForecastScenario
CREATE TABLE "ForecastScenario" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "demandMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "leadTimeChange" INTEGER NOT NULL DEFAULT 0,
    "priceChange" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "promotionImpact" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "results" JSONB,
    "costImpact" DECIMAL(12,2),
    "revenueImpact" DECIMAL(12,2),
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ForecastScenario_configId_fkey" FOREIGN KEY ("configId") REFERENCES "InventoryForecastConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ForecastScenario_configId_idx" ON "ForecastScenario"("configId");

-- InventoryForecastAnalytics
CREATE TABLE "InventoryForecastAnalytics" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "forecastAccuracy" DOUBLE PRECISION,
    "mapeScore" DOUBLE PRECISION,
    "totalSkus" INTEGER NOT NULL DEFAULT 0,
    "lowStockSkus" INTEGER NOT NULL DEFAULT 0,
    "overstockSkus" INTEGER NOT NULL DEFAULT 0,
    "stockoutSkus" INTEGER NOT NULL DEFAULT 0,
    "inventoryValue" DECIMAL(14,2),
    "potentialStockoutCost" DECIMAL(12,2),
    "holdingCost" DECIMAL(12,2),
    "alertsGenerated" INTEGER NOT NULL DEFAULT 0,
    "alertsResolved" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "InventoryForecastAnalytics_configId_date_key" ON "InventoryForecastAnalytics"("configId", "date");
CREATE INDEX "InventoryForecastAnalytics_configId_date_idx" ON "InventoryForecastAnalytics"("configId", "date" DESC);

-- ============================================================================
-- PART 3: TOOL 3.2 - COMPLIANCE MONITOR (8 tables)
-- ============================================================================

-- ComplianceMonitorConfig
CREATE TABLE "ComplianceMonitorConfig" (
    "id" SERIAL PRIMARY KEY,
    "tenantId" TEXT,
    "clientId" INTEGER UNIQUE,
    "accountId" INTEGER UNIQUE,
    "organizationName" TEXT,
    "industry" TEXT,
    "jurisdiction" TEXT,
    "enableHipaa" BOOLEAN NOT NULL DEFAULT false,
    "enableSox" BOOLEAN NOT NULL DEFAULT false,
    "enableGdpr" BOOLEAN NOT NULL DEFAULT false,
    "enablePci" BOOLEAN NOT NULL DEFAULT false,
    "enableFinra" BOOLEAN NOT NULL DEFAULT false,
    "customFrameworks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "realTimeMonitoring" BOOLEAN NOT NULL DEFAULT true,
    "monitoringFrequency" TEXT NOT NULL DEFAULT 'daily',
    "alertThreshold" TEXT NOT NULL DEFAULT 'medium',
    "notificationEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "slackWebhook" TEXT,
    "msTeamsWebhook" TEXT,
    "dataSourceConfigs" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "ComplianceMonitorConfig_tenantId_isActive_idx" ON "ComplianceMonitorConfig"("tenantId", "isActive");
CREATE INDEX "ComplianceMonitorConfig_clientId_isActive_idx" ON "ComplianceMonitorConfig"("clientId", "isActive");
CREATE INDEX "ComplianceMonitorConfig_accountId_isActive_idx" ON "ComplianceMonitorConfig"("accountId", "isActive");

-- ComplianceRule
CREATE TABLE "ComplianceRule" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "framework" TEXT NOT NULL,
    "category" TEXT,
    "ruleType" TEXT NOT NULL,
    "ruleDefinition" JSONB NOT NULL,
    "severity" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "isRealtime" BOOLEAN NOT NULL DEFAULT false,
    "checkFrequency" TEXT,
    "autoRemediate" BOOLEAN NOT NULL DEFAULT false,
    "remediationAction" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ComplianceRule_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ComplianceMonitorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ComplianceRule_configId_framework_idx" ON "ComplianceRule"("configId", "framework");
CREATE INDEX "ComplianceRule_configId_isActive_idx" ON "ComplianceRule"("configId", "isActive");

-- ComplianceViolation
CREATE TABLE "ComplianceViolation" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "ruleId" INTEGER NOT NULL,
    "status" "ViolationStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "RiskLevel" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceSystem" TEXT,
    "sourceReference" TEXT,
    "violationData" JSONB,
    "affectedEntities" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" INTEGER,
    "remediatedAt" TIMESTAMP(3),
    "remediatedBy" INTEGER,
    "remediationNotes" TEXT,
    "remediationEvidence" JSONB,
    "impactScore" INTEGER,
    "financialImpact" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ComplianceViolation_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ComplianceMonitorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ComplianceViolation_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ComplianceRule"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ComplianceViolation_configId_status_idx" ON "ComplianceViolation"("configId", "status");
CREATE INDEX "ComplianceViolation_configId_severity_idx" ON "ComplianceViolation"("configId", "severity");
CREATE INDEX "ComplianceViolation_ruleId_idx" ON "ComplianceViolation"("ruleId");
CREATE INDEX "ComplianceViolation_detectedAt_idx" ON "ComplianceViolation"("detectedAt" DESC);

-- ComplianceAudit
CREATE TABLE "ComplianceAudit" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "framework" TEXT NOT NULL,
    "scope" JSONB,
    "status" "AuditStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "leadAuditor" TEXT,
    "auditTeam" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "findings" JSONB,
    "overallScore" INTEGER,
    "passedControls" INTEGER,
    "failedControls" INTEGER,
    "totalControls" INTEGER,
    "recommendations" JSONB,
    "remediationPlan" JSONB,
    "reportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ComplianceAudit_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ComplianceMonitorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ComplianceAudit_configId_status_idx" ON "ComplianceAudit"("configId", "status");
CREATE INDEX "ComplianceAudit_scheduledDate_idx" ON "ComplianceAudit"("scheduledDate");

-- ComplianceEvidence
CREATE TABLE "ComplianceEvidence" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "evidenceType" TEXT NOT NULL,
    "framework" TEXT,
    "controlId" TEXT,
    "fileUrl" TEXT,
    "fileHash" TEXT,
    "content" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedBy" INTEGER,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" INTEGER,
    "retentionDays" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ComplianceEvidence_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ComplianceMonitorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ComplianceEvidence_configId_framework_idx" ON "ComplianceEvidence"("configId", "framework");
CREATE INDEX "ComplianceEvidence_configId_evidenceType_idx" ON "ComplianceEvidence"("configId", "evidenceType");

-- RiskAssessment
CREATE TABLE "RiskAssessment" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT,
    "overallRiskScore" INTEGER NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "scoreBreakdown" JSONB,
    "previousScore" INTEGER,
    "scoreTrend" TEXT,
    "riskFactors" JSONB,
    "mitigationPlan" JSONB,
    "mitigationStatus" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextAssessmentAt" TIMESTAMP(3),
    CONSTRAINT "RiskAssessment_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ComplianceMonitorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "RiskAssessment_configId_entityType_idx" ON "RiskAssessment"("configId", "entityType");
CREATE INDEX "RiskAssessment_configId_riskLevel_idx" ON "RiskAssessment"("configId", "riskLevel");
CREATE INDEX "RiskAssessment_assessedAt_idx" ON "RiskAssessment"("assessedAt" DESC);

-- ComplianceReport
CREATE TABLE "ComplianceReport" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "framework" TEXT,
    "period" TEXT,
    "reportData" JSONB,
    "summaryStats" JSONB,
    "charts" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" INTEGER,
    "fileUrl" TEXT,
    "submissionRequired" BOOLEAN NOT NULL DEFAULT false,
    "submissionDeadline" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "submissionRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplianceReport_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ComplianceMonitorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ComplianceReport_configId_reportType_idx" ON "ComplianceReport"("configId", "reportType");
CREATE INDEX "ComplianceReport_generatedAt_idx" ON "ComplianceReport"("generatedAt" DESC);

-- ComplianceMonitorAnalytics
CREATE TABLE "ComplianceMonitorAnalytics" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "totalViolations" INTEGER NOT NULL DEFAULT 0,
    "openViolations" INTEGER NOT NULL DEFAULT 0,
    "criticalViolations" INTEGER NOT NULL DEFAULT 0,
    "resolvedViolations" INTEGER NOT NULL DEFAULT 0,
    "averageRiskScore" DOUBLE PRECISION,
    "entitiesAtHighRisk" INTEGER NOT NULL DEFAULT 0,
    "overallComplianceScore" DOUBLE PRECISION,
    "frameworkScores" JSONB,
    "controlsMonitored" INTEGER NOT NULL DEFAULT 0,
    "controlsPassing" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "ComplianceMonitorAnalytics_configId_date_key" ON "ComplianceMonitorAnalytics"("configId", "date");
CREATE INDEX "ComplianceMonitorAnalytics_configId_date_idx" ON "ComplianceMonitorAnalytics"("configId", "date" DESC);

-- ============================================================================
-- PART 4: TOOL 3.3 - PREDICTIVE MAINTENANCE (10 tables)
-- ============================================================================

-- PredictiveMaintenanceConfig
CREATE TABLE "PredictiveMaintenanceConfig" (
    "id" SERIAL PRIMARY KEY,
    "tenantId" TEXT,
    "clientId" INTEGER UNIQUE,
    "accountId" INTEGER UNIQUE,
    "facilityName" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "predictionHorizonDays" INTEGER NOT NULL DEFAULT 30,
    "alertThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "modelUpdateFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "sensorDataRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "anomalyDetectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "realTimeMonitoring" BOOLEAN NOT NULL DEFAULT true,
    "iotGateway" TEXT,
    "iotCredentials" JSONB,
    "erp" TEXT,
    "erpCredentials" JSONB,
    "cmms" TEXT,
    "cmmsCredentials" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "PredictiveMaintenanceConfig_tenantId_isActive_idx" ON "PredictiveMaintenanceConfig"("tenantId", "isActive");
CREATE INDEX "PredictiveMaintenanceConfig_clientId_isActive_idx" ON "PredictiveMaintenanceConfig"("clientId", "isActive");
CREATE INDEX "PredictiveMaintenanceConfig_accountId_isActive_idx" ON "PredictiveMaintenanceConfig"("accountId", "isActive");

-- Equipment
CREATE TABLE "Equipment" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "assetTag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "category" TEXT,
    "criticality" TEXT,
    "location" TEXT,
    "department" TEXT,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "healthScore" INTEGER,
    "lastHealthCheck" TIMESTAMP(3),
    "installationDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "expectedLifeYears" INTEGER,
    "maintenanceSchedule" JSONB,
    "lastMaintenanceDate" TIMESTAMP(3),
    "nextMaintenanceDate" TIMESTAMP(3),
    "purchaseCost" DECIMAL(12,2),
    "maintenanceCostYtd" DECIMAL(12,2),
    "downtimeCostPerHour" DECIMAL(10,2),
    "externalAssetId" TEXT,
    "cmmsAssetId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Equipment_configId_fkey" FOREIGN KEY ("configId") REFERENCES "PredictiveMaintenanceConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Equipment_configId_assetTag_key" ON "Equipment"("configId", "assetTag");
CREATE INDEX "Equipment_configId_status_idx" ON "Equipment"("configId", "status");
CREATE INDEX "Equipment_configId_category_idx" ON "Equipment"("configId", "category");

-- Sensor
CREATE TABLE "Sensor" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "sensorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sensorType" TEXT NOT NULL,
    "unit" TEXT,
    "minThreshold" DOUBLE PRECISION,
    "maxThreshold" DOUBLE PRECISION,
    "normalRangeMin" DOUBLE PRECISION,
    "normalRangeMax" DOUBLE PRECISION,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "lastReading" DOUBLE PRECISION,
    "lastReadingAt" TIMESTAMP(3),
    "batteryLevel" INTEGER,
    "alertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "alertThreshold" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Sensor_configId_fkey" FOREIGN KEY ("configId") REFERENCES "PredictiveMaintenanceConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Sensor_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Sensor_configId_sensorId_key" ON "Sensor"("configId", "sensorId");
CREATE INDEX "Sensor_equipmentId_idx" ON "Sensor"("equipmentId");
CREATE INDEX "Sensor_sensorType_idx" ON "Sensor"("sensorType");

-- SensorReading
CREATE TABLE "SensorReading" (
    "id" SERIAL PRIMARY KEY,
    "sensorId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "quality" TEXT,
    "rawValue" DOUBLE PRECISION,
    "processedValue" DOUBLE PRECISION,
    CONSTRAINT "SensorReading_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SensorReading_sensorId_timestamp_idx" ON "SensorReading"("sensorId", "timestamp" DESC);

-- SensorAnomaly
CREATE TABLE "SensorAnomaly" (
    "id" SERIAL PRIMARY KEY,
    "sensorId" INTEGER NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anomalyType" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "expectedValue" DOUBLE PRECISION,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "deviation" DOUBLE PRECISION,
    "possibleCauses" JSONB,
    "recommendedAction" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    CONSTRAINT "SensorAnomaly_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "Sensor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SensorAnomaly_sensorId_detectedAt_idx" ON "SensorAnomaly"("sensorId", "detectedAt" DESC);
CREATE INDEX "SensorAnomaly_severity_isResolved_idx" ON "SensorAnomaly"("severity", "isResolved");

-- FailurePrediction
CREATE TABLE "FailurePrediction" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "failureType" TEXT NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "confidenceLevel" DOUBLE PRECISION,
    "predictedDate" TIMESTAMP(3),
    "predictionWindow" TEXT,
    "modelVersion" TEXT,
    "features" JSONB,
    "riskScore" INTEGER,
    "impactEstimate" JSONB,
    "recommendedAction" TEXT,
    "preventiveSteps" JSONB,
    "actualOutcome" TEXT,
    "outcomeDate" TIMESTAMP(3),
    "outcomeNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FailurePrediction_configId_fkey" FOREIGN KEY ("configId") REFERENCES "PredictiveMaintenanceConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FailurePrediction_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "FailurePrediction_configId_isActive_idx" ON "FailurePrediction"("configId", "isActive");
CREATE INDEX "FailurePrediction_equipmentId_predictedDate_idx" ON "FailurePrediction"("equipmentId", "predictedDate");
CREATE INDEX "FailurePrediction_probability_idx" ON "FailurePrediction"("probability" DESC);

-- MaintenanceWorkOrder
CREATE TABLE "MaintenanceWorkOrder" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "workOrderNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "MaintenanceType" NOT NULL,
    "priority" "WorkOrderPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assignedTo" TEXT,
    "assignedTeam" TEXT,
    "laborHours" DECIMAL(6,2),
    "partsUsed" JSONB,
    "notes" TEXT,
    "findings" TEXT,
    "laborCost" DECIMAL(10,2),
    "partsCost" DECIMAL(10,2),
    "totalCost" DECIMAL(10,2),
    "checklistItems" JSONB,
    "cmmsWorkOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MaintenanceWorkOrder_configId_fkey" FOREIGN KEY ("configId") REFERENCES "PredictiveMaintenanceConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceWorkOrder_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MaintenanceWorkOrder_configId_workOrderNumber_key" ON "MaintenanceWorkOrder"("configId", "workOrderNumber");
CREATE INDEX "MaintenanceWorkOrder_configId_status_idx" ON "MaintenanceWorkOrder"("configId", "status");
CREATE INDEX "MaintenanceWorkOrder_equipmentId_idx" ON "MaintenanceWorkOrder"("equipmentId");
CREATE INDEX "MaintenanceWorkOrder_scheduledDate_idx" ON "MaintenanceWorkOrder"("scheduledDate");

-- SparePart
CREATE TABLE "SparePart" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "partNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER,
    "reorderQuantity" INTEGER,
    "location" TEXT,
    "unitCost" DECIMAL(10,2),
    "supplier" TEXT,
    "leadTimeDays" INTEGER,
    "lastUsedDate" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "compatibleEquipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SparePart_configId_fkey" FOREIGN KEY ("configId") REFERENCES "PredictiveMaintenanceConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SparePart_configId_partNumber_key" ON "SparePart"("configId", "partNumber");
CREATE INDEX "SparePart_configId_category_idx" ON "SparePart"("configId", "category");

-- DowntimeEvent
CREATE TABLE "DowntimeEvent" (
    "id" SERIAL PRIMARY KEY,
    "equipmentId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "rootCause" TEXT,
    "productionLoss" DECIMAL(12,2),
    "laborCost" DECIMAL(10,2),
    "partsCost" DECIMAL(10,2),
    "totalCost" DECIMAL(12,2),
    "wasPlanned" BOOLEAN NOT NULL DEFAULT false,
    "wasPredicted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DowntimeEvent_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DowntimeEvent_equipmentId_startTime_idx" ON "DowntimeEvent"("equipmentId", "startTime" DESC);

-- PredictiveMaintenanceAnalytics
CREATE TABLE "PredictiveMaintenanceAnalytics" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "totalEquipment" INTEGER NOT NULL DEFAULT 0,
    "operationalEquipment" INTEGER NOT NULL DEFAULT 0,
    "equipmentInMaintenance" INTEGER NOT NULL DEFAULT 0,
    "criticalEquipment" INTEGER NOT NULL DEFAULT 0,
    "predictionsGenerated" INTEGER NOT NULL DEFAULT 0,
    "highRiskPredictions" INTEGER NOT NULL DEFAULT 0,
    "predictionsAccuracy" DOUBLE PRECISION,
    "workOrdersCreated" INTEGER NOT NULL DEFAULT 0,
    "workOrdersCompleted" INTEGER NOT NULL DEFAULT 0,
    "preventiveMaintenance" INTEGER NOT NULL DEFAULT 0,
    "correctiveMaintenance" INTEGER NOT NULL DEFAULT 0,
    "maintenanceCost" DECIMAL(12,2),
    "downtimeCost" DECIMAL(12,2),
    "costSavings" DECIMAL(12,2),
    "oeeScore" DOUBLE PRECISION,
    "availability" DOUBLE PRECISION,
    "performance" DOUBLE PRECISION,
    "quality" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "PredictiveMaintenanceAnalytics_configId_date_key" ON "PredictiveMaintenanceAnalytics"("configId", "date");
CREATE INDEX "PredictiveMaintenanceAnalytics_configId_date_idx" ON "PredictiveMaintenanceAnalytics"("configId", "date" DESC);

-- ============================================================================
-- PART 5: TOOL 3.4 - REVENUE MANAGEMENT (9 tables)
-- ============================================================================

-- RevenueManagementConfig
CREATE TABLE "RevenueManagementConfig" (
    "id" SERIAL PRIMARY KEY,
    "tenantId" TEXT,
    "clientId" INTEGER UNIQUE,
    "accountId" INTEGER UNIQUE,
    "businessName" TEXT,
    "businessType" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "pricingStrategy" "PricingStrategy" NOT NULL DEFAULT 'DYNAMIC',
    "minPriceFloor" DOUBLE PRECISION,
    "maxPriceCeiling" DOUBLE PRECISION,
    "priceChangeFrequency" TEXT NOT NULL DEFAULT 'daily',
    "forecastHorizonDays" INTEGER NOT NULL DEFAULT 90,
    "historicalDataMonths" INTEGER NOT NULL DEFAULT 24,
    "competitorMonitoring" BOOLEAN NOT NULL DEFAULT true,
    "competitorUpdateFrequency" TEXT NOT NULL DEFAULT 'daily',
    "autoApproveChanges" BOOLEAN NOT NULL DEFAULT false,
    "maxAutoChangePercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "pmsSystem" TEXT,
    "pmsCredentials" JSONB,
    "channelManager" TEXT,
    "channelCredentials" JSONB,
    "otaConnections" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "RevenueManagementConfig_tenantId_isActive_idx" ON "RevenueManagementConfig"("tenantId", "isActive");
CREATE INDEX "RevenueManagementConfig_clientId_isActive_idx" ON "RevenueManagementConfig"("clientId", "isActive");
CREATE INDEX "RevenueManagementConfig_accountId_isActive_idx" ON "RevenueManagementConfig"("accountId", "isActive");

-- RateCategory
CREATE TABLE "RateCategory" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryType" TEXT NOT NULL,
    "baseRate" DECIMAL(10,2) NOT NULL,
    "minRate" DECIMAL(10,2),
    "maxRate" DECIMAL(10,2),
    "totalInventory" INTEGER,
    "maxOccupancy" INTEGER,
    "pricingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "demandMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateCategory_configId_fkey" FOREIGN KEY ("configId") REFERENCES "RevenueManagementConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RateCategory_configId_code_key" ON "RateCategory"("configId", "code");
CREATE INDEX "RateCategory_configId_isActive_idx" ON "RateCategory"("configId", "isActive");

-- Competitor
CREATE TABLE "Competitor" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "location" TEXT,
    "starRating" DOUBLE PRECISION,
    "trackingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "scrapeUrl" TEXT,
    "apiEndpoint" TEXT,
    "categoryMapping" JSONB,
    "lastScrapedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Competitor_configId_fkey" FOREIGN KEY ("configId") REFERENCES "RevenueManagementConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Competitor_configId_isActive_idx" ON "Competitor"("configId", "isActive");

-- CompetitorRate
CREATE TABLE "CompetitorRate" (
    "id" SERIAL PRIMARY KEY,
    "competitorId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "categoryCode" TEXT,
    "rate" DECIMAL(10,2) NOT NULL,
    "availability" BOOLEAN NOT NULL DEFAULT true,
    "restrictions" JSONB,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetitorRate_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CompetitorRate_competitorId_date_idx" ON "CompetitorRate"("competitorId", "date");

-- DemandForecast
CREATE TABLE "DemandForecast" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "forecastDate" DATE NOT NULL,
    "predictedDemand" DOUBLE PRECISION NOT NULL,
    "predictedBookings" INTEGER,
    "confidenceLevel" DOUBLE PRECISION,
    "demandDrivers" JSONB,
    "isHoliday" BOOLEAN NOT NULL DEFAULT false,
    "isWeekend" BOOLEAN NOT NULL DEFAULT false,
    "eventImpact" JSONB,
    "recommendedRate" DECIMAL(10,2),
    "rateMultiplier" DOUBLE PRECISION,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DemandForecast_configId_fkey" FOREIGN KEY ("configId") REFERENCES "RevenueManagementConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DemandForecast_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RateCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DemandForecast_configId_categoryId_forecastDate_key" ON "DemandForecast"("configId", "categoryId", "forecastDate");
CREATE INDEX "DemandForecast_configId_forecastDate_idx" ON "DemandForecast"("configId", "forecastDate");

-- PriceRecommendation
CREATE TABLE "PriceRecommendation" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "currentRate" DECIMAL(10,2) NOT NULL,
    "recommendedRate" DECIMAL(10,2) NOT NULL,
    "changePercent" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "demandLevel" TEXT,
    "competitorPosition" TEXT,
    "confidence" DOUBLE PRECISION,
    "projectedBookings" INTEGER,
    "projectedRevenue" DECIMAL(12,2),
    "projectedRevPAR" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" INTEGER,
    "appliedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "PriceRecommendation_configId_fkey" FOREIGN KEY ("configId") REFERENCES "RevenueManagementConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PriceRecommendation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RateCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PriceRecommendation_configId_status_idx" ON "PriceRecommendation"("configId", "status");
CREATE INDEX "PriceRecommendation_categoryId_date_idx" ON "PriceRecommendation"("categoryId", "date");
CREATE INDEX "PriceRecommendation_date_idx" ON "PriceRecommendation"("date");

-- RevenuePromotion
CREATE TABLE "RevenuePromotion" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "bookingWindowStart" TIMESTAMP(3),
    "bookingWindowEnd" TIMESTAMP(3),
    "minNights" INTEGER,
    "maxNights" INTEGER,
    "applicableCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blackoutDates" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "maxUsage" INTEGER,
    "totalRevenue" DECIMAL(12,2),
    "projectedRoi" DOUBLE PRECISION,
    "actualRoi" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RevenuePromotion_configId_fkey" FOREIGN KEY ("configId") REFERENCES "RevenueManagementConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RevenuePromotion_configId_code_key" ON "RevenuePromotion"("configId", "code");
CREATE INDEX "RevenuePromotion_configId_isActive_idx" ON "RevenuePromotion"("configId", "isActive");
CREATE INDEX "RevenuePromotion_startDate_endDate_idx" ON "RevenuePromotion"("startDate", "endDate");

-- BookingData
CREATE TABLE "BookingData" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "stayDate" DATE NOT NULL,
    "checkoutDate" DATE,
    "rate" DECIMAL(10,2) NOT NULL,
    "nights" INTEGER NOT NULL DEFAULT 1,
    "totalRevenue" DECIMAL(12,2) NOT NULL,
    "rateType" "RateType" NOT NULL DEFAULT 'STANDARD',
    "channel" TEXT,
    "promotionCode" TEXT,
    "leadTimeDays" INTEGER,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingData_configId_fkey" FOREIGN KEY ("configId") REFERENCES "RevenueManagementConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingData_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RateCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "BookingData_configId_stayDate_idx" ON "BookingData"("configId", "stayDate");
CREATE INDEX "BookingData_categoryId_stayDate_idx" ON "BookingData"("categoryId", "stayDate");
CREATE INDEX "BookingData_bookingDate_idx" ON "BookingData"("bookingDate");

-- RevenueManagementAnalytics
CREATE TABLE "RevenueManagementAnalytics" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "occupancyRate" DOUBLE PRECISION,
    "availableInventory" INTEGER,
    "soldInventory" INTEGER,
    "totalRevenue" DECIMAL(12,2),
    "adr" DECIMAL(10,2),
    "revPar" DECIMAL(10,2),
    "revenueVsLastYear" DOUBLE PRECISION,
    "revParVsLastYear" DOUBLE PRECISION,
    "revenueVsBudget" DOUBLE PRECISION,
    "recommendationsApplied" INTEGER NOT NULL DEFAULT 0,
    "priceChangesAuto" INTEGER NOT NULL DEFAULT 0,
    "priceChangesManual" INTEGER NOT NULL DEFAULT 0,
    "avgCompetitorRate" DECIMAL(10,2),
    "marketPosition" TEXT,
    "forecastAccuracy" DOUBLE PRECISION,
    "demandVariance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "RevenueManagementAnalytics_configId_date_key" ON "RevenueManagementAnalytics"("configId", "date");
CREATE INDEX "RevenueManagementAnalytics_configId_date_idx" ON "RevenueManagementAnalytics"("configId", "date" DESC);

-- ============================================================================
-- PART 6: TOOL 3.5 - SAFETY MONITOR (10 tables)
-- ============================================================================

-- SafetyMonitorConfig
CREATE TABLE "SafetyMonitorConfig" (
    "id" SERIAL PRIMARY KEY,
    "tenantId" TEXT,
    "clientId" INTEGER UNIQUE,
    "accountId" INTEGER UNIQUE,
    "organizationName" TEXT,
    "industry" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "oshaEnabled" BOOLEAN NOT NULL DEFAULT true,
    "stateRegulations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "industryStandards" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "incidentAlertEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "safetyManagerEmail" TEXT,
    "emergencyContacts" JSONB,
    "oshaEstablishmentName" TEXT,
    "oshaEstablishmentAddress" JSONB,
    "oshaReportingThreshold" INTEGER NOT NULL DEFAULT 10,
    "enableMobileApp" BOOLEAN NOT NULL DEFAULT true,
    "requirePhotoEvidence" BOOLEAN NOT NULL DEFAULT false,
    "enableOfflineMode" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "SafetyMonitorConfig_tenantId_isActive_idx" ON "SafetyMonitorConfig"("tenantId", "isActive");
CREATE INDEX "SafetyMonitorConfig_clientId_isActive_idx" ON "SafetyMonitorConfig"("clientId", "isActive");
CREATE INDEX "SafetyMonitorConfig_accountId_isActive_idx" ON "SafetyMonitorConfig"("accountId", "isActive");

-- SafetyChecklist
CREATE TABLE "SafetyChecklist" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "department" TEXT,
    "location" TEXT,
    "frequency" TEXT,
    "dueTime" TEXT,
    "items" JSONB NOT NULL,
    "regulatoryReference" TEXT,
    "complianceCategory" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SafetyChecklist_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SafetyMonitorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SafetyChecklist_configId_category_idx" ON "SafetyChecklist"("configId", "category");
CREATE INDEX "SafetyChecklist_configId_isActive_idx" ON "SafetyChecklist"("configId", "isActive");

-- ChecklistCompletion
CREATE TABLE "ChecklistCompletion" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "checklistId" INTEGER NOT NULL,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "assignedTo" INTEGER,
    "assignedToName" TEXT,
    "location" TEXT,
    "department" TEXT,
    "dueDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "responses" JSONB,
    "deficienciesFound" INTEGER NOT NULL DEFAULT 0,
    "correctiveActions" JSONB,
    "signatureUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChecklistCompletion_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SafetyMonitorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChecklistCompletion_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "SafetyChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ChecklistCompletion_configId_status_idx" ON "ChecklistCompletion"("configId", "status");
CREATE INDEX "ChecklistCompletion_checklistId_dueDate_idx" ON "ChecklistCompletion"("checklistId", "dueDate");
CREATE INDEX "ChecklistCompletion_assignedTo_status_idx" ON "ChecklistCompletion"("assignedTo", "status");

-- SafetyIncident
CREATE TABLE "SafetyIncident" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "incidentNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "incidentType" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'REPORTED',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT,
    "department" TEXT,
    "specificLocation" TEXT,
    "affectedPersons" JSONB,
    "witnesses" JSONB,
    "reportedBy" TEXT,
    "reportedById" INTEGER,
    "isOshaRecordable" BOOLEAN NOT NULL DEFAULT false,
    "oshaClassification" TEXT,
    "daysAwayFromWork" INTEGER,
    "daysRestricted" INTEGER,
    "daysTransferred" INTEGER,
    "investigator" TEXT,
    "investigatorId" INTEGER,
    "investigationStartedAt" TIMESTAMP(3),
    "rootCause" TEXT,
    "contributingFactors" JSONB,
    "correctiveActions" JSONB,
    "preventiveMeasures" JSONB,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SafetyIncident_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SafetyMonitorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SafetyIncident_configId_incidentNumber_key" ON "SafetyIncident"("configId", "incidentNumber");
CREATE INDEX "SafetyIncident_configId_status_idx" ON "SafetyIncident"("configId", "status");
CREATE INDEX "SafetyIncident_configId_severity_idx" ON "SafetyIncident"("configId", "severity");
CREATE INDEX "SafetyIncident_occurredAt_idx" ON "SafetyIncident"("occurredAt" DESC);

-- HazardReport
CREATE TABLE "HazardReport" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hazardType" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "location" TEXT,
    "department" TEXT,
    "reportedBy" TEXT,
    "reportedById" INTEGER,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "likelihood" INTEGER,
    "consequence" INTEGER,
    "riskScore" INTEGER,
    "controlMeasures" JSONB,
    "mitigationStatus" TEXT NOT NULL DEFAULT 'open',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" INTEGER,
    "residualRisk" INTEGER,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HazardReport_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SafetyMonitorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "HazardReport_configId_riskLevel_idx" ON "HazardReport"("configId", "riskLevel");
CREATE INDEX "HazardReport_configId_mitigationStatus_idx" ON "HazardReport"("configId", "mitigationStatus");

-- TrainingRequirement
CREATE TABLE "TrainingRequirement" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "frequency" TEXT,
    "validityPeriodDays" INTEGER,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "regulatoryReference" TEXT,
    "complianceCategory" TEXT,
    "applicableRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applicableDepartments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contentUrl" TEXT,
    "durationMinutes" INTEGER,
    "passingScore" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrainingRequirement_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SafetyMonitorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TrainingRequirement_configId_category_idx" ON "TrainingRequirement"("configId", "category");
CREATE INDEX "TrainingRequirement_configId_isActive_idx" ON "TrainingRequirement"("configId", "isActive");

-- TrainingRecord
CREATE TABLE "TrainingRecord" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "requirementId" INTEGER NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "department" TEXT,
    "role" TEXT,
    "status" "TrainingStatus" NOT NULL DEFAULT 'NOT_ASSIGNED',
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "score" INTEGER,
    "passed" BOOLEAN,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "certificateUrl" TEXT,
    "certificateNumber" TEXT,
    "lastReminderSent" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrainingRecord_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SafetyMonitorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrainingRecord_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "TrainingRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TrainingRecord_configId_requirementId_employeeId_key" ON "TrainingRecord"("configId", "requirementId", "employeeId");
CREATE INDEX "TrainingRecord_configId_status_idx" ON "TrainingRecord"("configId", "status");
CREATE INDEX "TrainingRecord_employeeId_idx" ON "TrainingRecord"("employeeId");
CREATE INDEX "TrainingRecord_expiresAt_idx" ON "TrainingRecord"("expiresAt");

-- OshaLog
CREATE TABLE "OshaLog" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "department" TEXT,
    "dateOfInjury" TIMESTAMP(3) NOT NULL,
    "locationOfEvent" TEXT,
    "description" TEXT NOT NULL,
    "injuryType" TEXT NOT NULL,
    "bodyPartAffected" TEXT,
    "resultedInDeath" BOOLEAN NOT NULL DEFAULT false,
    "daysAwayFromWork" INTEGER NOT NULL DEFAULT 0,
    "daysJobTransfer" INTEGER NOT NULL DEFAULT 0,
    "daysRestriction" INTEGER NOT NULL DEFAULT 0,
    "otherRecordable" BOOLEAN NOT NULL DEFAULT false,
    "incidentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OshaLog_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SafetyMonitorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OshaLog_configId_year_caseNumber_key" ON "OshaLog"("configId", "year", "caseNumber");
CREATE INDEX "OshaLog_configId_year_idx" ON "OshaLog"("configId", "year");

-- SafetyInspection
CREATE TABLE "SafetyInspection" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "inspectionType" TEXT NOT NULL,
    "inspector" TEXT,
    "inspectorId" INTEGER,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "location" TEXT,
    "department" TEXT,
    "areasInspected" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "overallScore" INTEGER,
    "findings" JSONB,
    "deficiencies" INTEGER NOT NULL DEFAULT 0,
    "criticalFindings" INTEGER NOT NULL DEFAULT 0,
    "correctiveActions" JSONB,
    "followUpDate" TIMESTAMP(3),
    "reportUrl" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SafetyInspection_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SafetyMonitorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SafetyInspection_configId_status_idx" ON "SafetyInspection"("configId", "status");
CREATE INDEX "SafetyInspection_scheduledDate_idx" ON "SafetyInspection"("scheduledDate");

-- SafetyMonitorAnalytics
CREATE TABLE "SafetyMonitorAnalytics" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "totalIncidents" INTEGER NOT NULL DEFAULT 0,
    "oshaRecordables" INTEGER NOT NULL DEFAULT 0,
    "nearMisses" INTEGER NOT NULL DEFAULT 0,
    "daysWithoutIncident" INTEGER NOT NULL DEFAULT 0,
    "minorIncidents" INTEGER NOT NULL DEFAULT 0,
    "seriousIncidents" INTEGER NOT NULL DEFAULT 0,
    "severeIncidents" INTEGER NOT NULL DEFAULT 0,
    "checklistsCompleted" INTEGER NOT NULL DEFAULT 0,
    "checklistsOverdue" INTEGER NOT NULL DEFAULT 0,
    "deficienciesFound" INTEGER NOT NULL DEFAULT 0,
    "hazardsReported" INTEGER NOT NULL DEFAULT 0,
    "hazardsMitigated" INTEGER NOT NULL DEFAULT 0,
    "openHazards" INTEGER NOT NULL DEFAULT 0,
    "trainingsCompleted" INTEGER NOT NULL DEFAULT 0,
    "trainingsOverdue" INTEGER NOT NULL DEFAULT 0,
    "complianceRate" DOUBLE PRECISION,
    "trir" DOUBLE PRECISION,
    "dart" DOUBLE PRECISION,
    "ltir" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "SafetyMonitorAnalytics_configId_date_key" ON "SafetyMonitorAnalytics"("configId", "date");
CREATE INDEX "SafetyMonitorAnalytics_configId_date_idx" ON "SafetyMonitorAnalytics"("configId", "date" DESC);

-- ============================================================================
-- PART 7: FOREIGN KEYS - Config tables to Tenant, Client, Account
-- ============================================================================

-- InventoryForecastConfig FKs
ALTER TABLE "InventoryForecastConfig" ADD CONSTRAINT "InventoryForecastConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryForecastConfig" ADD CONSTRAINT "InventoryForecastConfig_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryForecastConfig" ADD CONSTRAINT "InventoryForecastConfig_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ComplianceMonitorConfig FKs
ALTER TABLE "ComplianceMonitorConfig" ADD CONSTRAINT "ComplianceMonitorConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceMonitorConfig" ADD CONSTRAINT "ComplianceMonitorConfig_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceMonitorConfig" ADD CONSTRAINT "ComplianceMonitorConfig_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PredictiveMaintenanceConfig FKs
ALTER TABLE "PredictiveMaintenanceConfig" ADD CONSTRAINT "PredictiveMaintenanceConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PredictiveMaintenanceConfig" ADD CONSTRAINT "PredictiveMaintenanceConfig_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PredictiveMaintenanceConfig" ADD CONSTRAINT "PredictiveMaintenanceConfig_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RevenueManagementConfig FKs
ALTER TABLE "RevenueManagementConfig" ADD CONSTRAINT "RevenueManagementConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevenueManagementConfig" ADD CONSTRAINT "RevenueManagementConfig_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevenueManagementConfig" ADD CONSTRAINT "RevenueManagementConfig_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SafetyMonitorConfig FKs
ALTER TABLE "SafetyMonitorConfig" ADD CONSTRAINT "SafetyMonitorConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyMonitorConfig" ADD CONSTRAINT "SafetyMonitorConfig_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyMonitorConfig" ADD CONSTRAINT "SafetyMonitorConfig_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
