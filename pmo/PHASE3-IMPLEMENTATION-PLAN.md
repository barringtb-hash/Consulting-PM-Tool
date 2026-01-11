# Phase 3 AI Tools - Database Implementation Plan

**Created:** January 5, 2026
**Status:** Ready for Implementation
**Estimated Tables:** 46 models across 5 tools
**Estimated Enums:** 16 enums

---

## Executive Summary

The Phase 3 AI Tools are fully defined in the Prisma schema but their database tables have never been created via migration. The web app UI exists but cannot function without the backing tables. This plan creates all required tables in a single migration.

---

## Scope

### Tools to Implement

| Tool                       | Config Model                  | Child Models        | Total Tables  |
| -------------------------- | ----------------------------- | ------------------- | ------------- |
| 3.1 Inventory Forecasting  | `InventoryForecastConfig`     | 8 related models    | 9             |
| 3.2 Compliance Monitor     | `ComplianceMonitorConfig`     | 7 related models    | 8             |
| 3.3 Predictive Maintenance | `PredictiveMaintenanceConfig` | 9 related models    | 10            |
| 3.4 Revenue Management     | `RevenueManagementConfig`     | 8 related models    | 9             |
| 3.5 Safety Monitor         | `SafetyMonitorConfig`         | 9 related models    | 10            |
| **Total**                  | **5 configs**                 | **41 child models** | **46 tables** |

### Enums Required

| Enum                | Used By                           |
| ------------------- | --------------------------------- |
| `ForecastStatus`    | Inventory Forecasting             |
| `AlertSeverity`     | Inventory, Predictive Maintenance |
| `AlertStatus`       | Inventory Forecasting             |
| `RiskLevel`         | Compliance, Safety                |
| `ViolationStatus`   | Compliance Monitor                |
| `AuditStatus`       | Compliance Monitor                |
| `EquipmentStatus`   | Predictive Maintenance            |
| `MaintenanceType`   | Predictive Maintenance            |
| `WorkOrderStatus`   | Predictive Maintenance            |
| `WorkOrderPriority` | Predictive Maintenance            |
| `PricingStrategy`   | Revenue Management                |
| `RateType`          | Revenue Management                |
| `IncidentSeverity`  | Safety Monitor                    |
| `IncidentStatus`    | Safety Monitor                    |
| `ChecklistStatus`   | Safety Monitor                    |
| `TrainingStatus`    | Safety Monitor                    |

---

## Implementation Steps

### Step 1: Create Migration File

Create migration: `pmo/prisma/migrations/[timestamp]_create_phase3_ai_tool_tables/migration.sql`

**Order of Operations:**

1. Create all enums first (must exist before tables reference them)
2. Create config tables (parent tables)
3. Create child tables in dependency order
4. Add foreign keys and indexes

### Step 2: Uncomment Schema Relations

In `pmo/prisma/schema.prisma`, uncomment:

**Account model (~line 351-356):**

```prisma
inventoryForecastConfig     InventoryForecastConfig?
complianceMonitorConfig     ComplianceMonitorConfig?
predictiveMaintenanceConfig PredictiveMaintenanceConfig?
revenueManagementConfig     RevenueManagementConfig?
safetyMonitorConfig         SafetyMonitorConfig?
```

**Tenant model (~line 7024-7029):**

```prisma
inventoryForecastConfigs     InventoryForecastConfig[]
complianceMonitorConfigs     ComplianceMonitorConfig[]
predictiveMaintenanceConfigs PredictiveMaintenanceConfig[]
revenueManagementConfigs     RevenueManagementConfig[]
safetyMonitorConfigs         SafetyMonitorConfig[]
```

**Client model (~line 348-356):**

```prisma
inventoryForecastConfig     InventoryForecastConfig?
complianceMonitorConfig     ComplianceMonitorConfig?
predictiveMaintenanceConfig PredictiveMaintenanceConfig?
revenueManagementConfig     RevenueManagementConfig?
safetyMonitorConfig         SafetyMonitorConfig?
```

**Each Phase 3 Config model (5 models):**

```prisma
tenant    Tenant?  @relation(...)
client    Client?  @relation(...)
account   Account? @relation(...)
```

### Step 3: Update Service Files

Restore the `client` include in `inventory-forecasting.service.ts` (lines 96, 129):

```typescript
include: {
  client: { select: { id: true, name: true, industry: true } },
  _count: { ... }
}
```

### Step 4: Run Migration

```bash
cd pmo
npx prisma migrate dev --name create_phase3_ai_tool_tables
npx prisma generate
```

### Step 5: Verify Build

```bash
npm run lint
npm run build --workspace pmo-api
```

---

## Detailed Migration SQL

The migration will include:

### Part 1: Enums (~200 lines)

```sql
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
```

### Part 2: Config Tables (~300 lines)

Each config table includes:

- Primary key (autoincrement INT)
- `tenantId` (FK to Tenant)
- `clientId` (deprecated, FK to Client)
- `accountId` (preferred, FK to Account)
- Tool-specific configuration fields
- `isActive`, `createdAt`, `updatedAt`
- Indexes on `tenantId`, `clientId`, `accountId`

### Part 3: Child Tables (~1500 lines)

46 tables with all columns, foreign keys, indexes, and unique constraints as defined in the schema.

### Part 4: Foreign Keys (~100 lines)

Add all FK constraints for:

- Config → Tenant, Client, Account
- Child tables → Config
- Child tables → Other child tables (where applicable)

---

## Risk Mitigation

### Rollback Plan

If migration fails:

```bash
npx prisma migrate resolve --rolled-back [migration_name]
```

### Validation Checkpoints

1. **Pre-migration:** Schema validates with `npx prisma validate`
2. **Post-migration:** All 46 tables exist in database
3. **Post-generate:** Prisma client includes all new types
4. **Post-build:** TypeScript compilation succeeds

---

## Files to Modify

| File                                                                          | Changes                      |
| ----------------------------------------------------------------------------- | ---------------------------- |
| `prisma/migrations/[timestamp]_create_phase3_ai_tool_tables/migration.sql`    | NEW - Full migration SQL     |
| `prisma/schema.prisma`                                                        | Uncomment ~30 relation lines |
| `apps/api/src/modules/inventory-forecasting/inventory-forecasting.service.ts` | Restore client include       |

---

## Estimated Effort

| Task                       | Time        |
| -------------------------- | ----------- |
| Generate migration SQL     | 15 min      |
| Uncomment schema relations | 5 min       |
| Update service files       | 5 min       |
| Run migration & validate   | 5 min       |
| **Total**                  | **~30 min** |

---

## Approval

- [ ] Plan reviewed
- [ ] Ready to implement

---

_Last Updated: January 5, 2026_
