# Performance Fix Implementation Plan

**Created:** December 17, 2025
**Based on:** [PERFORMANCE-AUDIT-REPORT.md](./PERFORMANCE-AUDIT-REPORT.md)
**Total Issues:** 28
**Estimated Total Effort:** 45-50 hours

---

## Table of Contents

1. [Phase 1: Critical Backend N+1 Fixes](#phase-1-critical-backend-n1-fixes-week-1)
2. [Phase 2: React Query & Context Optimization](#phase-2-react-query--context-optimization-week-1)
3. [Phase 3: Component Memoization](#phase-3-component-memoization-week-2)
4. [Phase 4: Algorithm Optimization](#phase-4-algorithm-optimization-week-2)
5. [Phase 5: Advanced Optimizations](#phase-5-advanced-optimizations-week-3-4)
6. [Phase 6: Low Priority Fixes](#phase-6-low-priority-fixes-backlog)
7. [Testing & Verification Strategy](#testing--verification-strategy)

---

## Phase 1: Critical Backend N+1 Fixes (Week 1)

### 1.1 Fix CSM Performance Metrics N+1 Pattern

**File:** `pmo/apps/api/src/modules/customer-success/analytics.service.ts`
**Function:** `getCSMPerformanceMetrics()` (Lines 288-379)
**Priority:** CRITICAL
**Estimated Effort:** 4 hours

#### Current Implementation Problem

The function iterates over users and executes 5+ queries per user inside the loop:

```typescript
// CURRENT: Lines 307-376 - N+1 anti-pattern
for (const user of users) {
  const successPlans = await prisma.successPlan.findMany({...});      // Query 1
  const healthScores = await prisma.customerHealthScore.findMany({...}); // Query 2
  const ctaStats = await prisma.cTA.groupBy({...});                   // Query 3
  const overdueCTAs = await prisma.cTA.count({...});                  // Query 4
  const meetingsLast30Days = await prisma.meeting.count({...});       // Query 5
}
```

#### Implementation Steps

**Step 1:** Extract user IDs upfront
```typescript
const userIds = users.map(u => u.id);
```

**Step 2:** Batch fetch all success plans for all users in one query
```typescript
const allSuccessPlans = await prisma.successPlan.findMany({
  where: { ownerId: { in: userIds } },
  select: { ownerId: true, clientId: true, status: true },
});

// Create a Map for O(1) lookup by ownerId
const successPlansByOwner = new Map<number, typeof allSuccessPlans>();
for (const plan of allSuccessPlans) {
  if (!successPlansByOwner.has(plan.ownerId)) {
    successPlansByOwner.set(plan.ownerId, []);
  }
  successPlansByOwner.get(plan.ownerId)!.push(plan);
}
```

**Step 3:** Batch fetch all CTA data
```typescript
const allCTAs = await prisma.cTA.findMany({
  where: { ownerId: { in: userIds } },
  select: { ownerId: true, status: true, dueDate: true },
});

// Group by ownerId
const ctasByOwner = new Map<number, typeof allCTAs>();
for (const cta of allCTAs) {
  if (!ctasByOwner.has(cta.ownerId)) {
    ctasByOwner.set(cta.ownerId, []);
  }
  ctasByOwner.get(cta.ownerId)!.push(cta);
}
```

**Step 4:** Get all unique client IDs from success plans, then batch fetch health scores
```typescript
const allClientIds = [...new Set(allSuccessPlans.map(sp => sp.clientId))];

const allHealthScores = await prisma.customerHealthScore.findMany({
  where: { clientId: { in: allClientIds }, projectId: null },
  select: { clientId: true, overallScore: true },
});

// Index by clientId
const healthScoresByClient = new Map<number, number>();
for (const hs of allHealthScores) {
  healthScoresByClient.set(hs.clientId, hs.overallScore);
}
```

**Step 5:** Batch fetch meetings count using groupBy
```typescript
const meetingCounts = await prisma.meeting.groupBy({
  by: ['projectId'],
  where: {
    project: { clientId: { in: allClientIds } },
    date: { gte: thirtyDaysAgo },
  },
  _count: true,
});

// Need to join with projects to get clientId mapping
const projectClientMap = await prisma.project.findMany({
  where: { clientId: { in: allClientIds } },
  select: { id: true, clientId: true },
});

// Build client -> meeting count map
const meetingsByClient = new Map<number, number>();
for (const proj of projectClientMap) {
  const count = meetingCounts.find(m => m.projectId === proj.id)?._count ?? 0;
  meetingsByClient.set(
    proj.clientId,
    (meetingsByClient.get(proj.clientId) ?? 0) + count
  );
}
```

**Step 6:** Process all data in-memory
```typescript
const metrics: CSMPerformanceMetrics[] = [];

for (const user of users) {
  const userSuccessPlans = successPlansByOwner.get(user.id) ?? [];
  const uniqueClientIds = [...new Set(userSuccessPlans.map(sp => sp.clientId))];

  // Calculate avg health score from pre-fetched data
  const clientHealthScores = uniqueClientIds
    .map(cid => healthScoresByClient.get(cid))
    .filter((s): s is number => s !== undefined);

  const avgHealthScore = clientHealthScores.length > 0
    ? Math.round(clientHealthScores.reduce((a, b) => a + b, 0) / clientHealthScores.length)
    : 0;

  // Calculate CTA stats from pre-fetched data
  const userCTAs = ctasByOwner.get(user.id) ?? [];
  const ctasCompleted = userCTAs.filter(c => c.status === 'COMPLETED').length;
  const overdueCTAs = userCTAs.filter(c =>
    c.dueDate && c.dueDate < new Date() &&
    c.status !== 'COMPLETED' && c.status !== 'CANCELLED'
  ).length;

  // Calculate meetings from pre-fetched data
  const meetingsLast30Days = uniqueClientIds.reduce(
    (sum, cid) => sum + (meetingsByClient.get(cid) ?? 0), 0
  );

  // Active success plans
  const successPlansActive = userSuccessPlans.filter(
    sp => sp.status === SuccessPlanStatus.ACTIVE
  ).length;

  metrics.push({
    userId: user.id,
    userName: user.name,
    totalClients: uniqueClientIds.length,
    avgHealthScore,
    ctasCompleted,
    ctasOverdue: overdueCTAs,
    successPlansActive,
    meetingsLast30Days,
  });
}
```

**Step 7:** Write unit test
```typescript
// pmo/apps/api/test/modules/customer-success/analytics.service.test.ts
describe('getCSMPerformanceMetrics', () => {
  it('should execute a fixed number of queries regardless of user count', async () => {
    // Create test data with 10 users
    // Count queries using Prisma middleware or mock
    // Assert query count is < 10 (not N*5)
  });
});
```

#### Verification
- Run the function with 10 users and verify < 10 total queries
- Measure response time before/after (expect 80%+ improvement)

---

### 1.2 Fix Time to Value Metrics N+1 Pattern

**File:** `pmo/apps/api/src/modules/customer-success/analytics.service.ts`
**Function:** `getTimeToValueMetrics()` (Lines 384-473)
**Priority:** CRITICAL
**Estimated Effort:** 2 hours

#### Current Implementation Problem

```typescript
// CURRENT: Lines 418-421 - Query inside loop
for (const project of projects) {
  const firstCompletedTask = await prisma.task.findFirst({
    where: { projectId: project.id, status: 'DONE' },
    orderBy: { updatedAt: 'asc' },
  });
}
```

#### Implementation Steps

**Step 1:** Fetch all completed tasks for all projects in one query
```typescript
const projectIds = projects.map(p => p.id);

// Get first completed task per project using raw query for efficiency
const firstCompletedTasks = await prisma.$queryRaw<Array<{
  projectId: number;
  updatedAt: Date;
}>>`
  SELECT DISTINCT ON ("projectId") "projectId", "updatedAt"
  FROM "Task"
  WHERE "projectId" = ANY(${projectIds}::int[])
    AND "status" = 'DONE'
  ORDER BY "projectId", "updatedAt" ASC
`;

// Alternative using Prisma (less efficient but works):
const allCompletedTasks = await prisma.task.findMany({
  where: {
    projectId: { in: projectIds },
    status: 'DONE',
  },
  orderBy: { updatedAt: 'asc' },
  select: { projectId: true, updatedAt: true },
});

// Create Map keeping only first task per project
const firstTaskByProject = new Map<number, Date>();
for (const task of allCompletedTasks) {
  if (!firstTaskByProject.has(task.projectId)) {
    firstTaskByProject.set(task.projectId, task.updatedAt);
  }
}
```

**Step 2:** Update the loop to use the Map
```typescript
for (const project of projects) {
  const startDate = project.startDate || project.createdAt;

  // Use Map lookup instead of query
  const firstTaskDate = firstTaskByProject.get(project.id);

  if (firstTaskDate) {
    const days = Math.floor(
      (firstTaskDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days >= 0) {
      onboardingTimes.push(days);
    }
  }

  // ... rest of processing
}
```

#### Verification
- Test with 100 projects, verify only 2-3 queries total
- Measure response time improvement

---

### 1.3 Fix Tenant Health N+1 Pattern

**File:** `pmo/apps/api/src/services/tenant-health.service.ts`
**Function:** `getAllTenantsHealth()` (Lines 616-641)
**Priority:** CRITICAL
**Estimated Effort:** 6 hours

#### Current Implementation Problem

```typescript
// CURRENT: Lines 616-641 - Calls getTenantHealth() per tenant (11+ queries each)
const summaries = await Promise.all(
  tenants.map(async (tenant) => {
    const health = await getTenantHealth(tenant.id); // 11+ queries inside
    return {...};
  })
);
```

#### Implementation Steps

**Step 1:** Create a new batch function `getBatchTenantHealth()`
```typescript
export async function getBatchTenantHealth(
  tenantIds: string[]
): Promise<Map<string, TenantHealthSummary>> {
  // Batch query 1: Get all tenants with users
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    include: { users: { include: { user: true } } },
  });

  // Batch query 2: Get all entity counts grouped by tenant
  const [accountCounts, contactCounts, opportunityCounts] = await Promise.all([
    prisma.account.groupBy({
      by: ['tenantId'],
      where: { tenantId: { in: tenantIds } },
      _count: true,
    }),
    prisma.cRMContact.groupBy({
      by: ['tenantId'],
      where: { tenantId: { in: tenantIds } },
      _count: true,
    }),
    prisma.opportunity.groupBy({
      by: ['tenantId'],
      where: { tenantId: { in: tenantIds } },
      _count: true,
    }),
  ]);

  // Create lookup maps
  const accountCountMap = new Map(accountCounts.map(c => [c.tenantId, c._count]));
  const contactCountMap = new Map(contactCounts.map(c => [c.tenantId, c._count]));
  const opportunityCountMap = new Map(opportunityCounts.map(c => [c.tenantId, c._count]));

  // Batch query 3: Get activity counts for last week
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentActivities = await prisma.cRMActivity.groupBy({
    by: ['tenantId'],
    where: {
      tenantId: { in: tenantIds },
      createdAt: { gte: sevenDaysAgo },
    },
    _count: true,
  });
  const activityCountMap = new Map(recentActivities.map(a => [a.tenantId, a._count]));

  // Batch query 4: Get latest health metrics for all tenants
  const latestMetrics = await prisma.tenantHealthMetrics.findMany({
    where: { tenantId: { in: tenantIds } },
    orderBy: { recordedAt: 'desc' },
    distinct: ['tenantId'],
  });
  const metricsMap = new Map(latestMetrics.map(m => [m.tenantId, m]));

  // Batch query 5: Get active user counts from audit logs
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const activeUsers = await prisma.auditLog.groupBy({
    by: ['tenantId', 'userId'],
    where: {
      tenantId: { in: tenantIds },
      createdAt: { gte: thirtyDaysAgo },
      userId: { not: null },
    },
  });

  // Count unique users per tenant
  const activeUserCountMap = new Map<string, number>();
  for (const entry of activeUsers) {
    const current = activeUserCountMap.get(entry.tenantId) ?? 0;
    activeUserCountMap.set(entry.tenantId, current + 1);
  }

  // Build results
  const results = new Map<string, TenantHealthSummary>();

  for (const tenant of tenants) {
    const limits = getPlanLimits(tenant.plan);
    const accountCount = accountCountMap.get(tenant.id) ?? 0;
    const contactCount = contactCountMap.get(tenant.id) ?? 0;
    const opportunityCount = opportunityCountMap.get(tenant.id) ?? 0;
    const metrics = metricsMap.get(tenant.id);
    const activeCount = activeUserCountMap.get(tenant.id) ?? 0;

    // Build usage metrics
    const usage: UsageMetrics = {
      users: {
        total: tenant.users.length,
        active: activeCount,
        limit: limits.maxUsers,
        percentage: calculatePercentage(tenant.users.length, limits.maxUsers),
      },
      accounts: {
        total: accountCount,
        limit: limits.maxAccounts,
        percentage: calculatePercentage(accountCount, limits.maxAccounts),
      },
      contacts: {
        total: contactCount,
        limit: limits.maxContacts,
        percentage: calculatePercentage(contactCount, limits.maxContacts),
      },
      opportunities: {
        total: opportunityCount,
        limit: limits.maxOpportunities,
        percentage: calculatePercentage(opportunityCount, limits.maxOpportunities),
      },
      storage: {
        usedMB: metrics?.storageUsedMB ?? 0,
        limitMB: limits.maxStorageMB,
        percentage: calculatePercentage(metrics?.storageUsedMB ?? 0, limits.maxStorageMB),
      },
      apiCalls: {
        today: metrics?.apiCallsToday ?? 0,
        thisMonth: metrics?.apiCallsMonth ?? 0,
        dailyLimit: limits.maxApiCallsPerDay,
        percentage: calculatePercentage(metrics?.apiCallsToday ?? 0, limits.maxApiCallsPerDay),
      },
    };

    // Calculate health score and alerts
    const alerts = generateAlerts(usage);
    const healthScore = calculateHealthScore(usage, alerts);

    results.set(tenant.id, {
      tenantId: tenant.id,
      tenantName: tenant.name,
      plan: tenant.plan,
      status: tenant.status,
      healthScore,
      usage,
      engagement: {
        dailyActiveUsers: 0, // Simplified for batch
        weeklyActiveUsers: 0,
        monthlyActiveUsers: activeCount,
        avgSessionDuration: 0,
        lastActivityAt: null,
        activitiesCreatedThisWeek: activityCountMap.get(tenant.id) ?? 0,
        opportunitiesUpdatedThisWeek: 0,
      },
      alerts,
      recordedAt: new Date(),
    });
  }

  return results;
}
```

**Step 2:** Update `getAllTenantsHealth()` to use batch function
```typescript
export async function getAllTenantsHealth(): Promise<{
  tenants: Array<{ tenantId: string; tenantName: string; healthScore: number; ... }>;
  summary: { ... };
}> {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
  });

  const tenantIds = tenants.map(t => t.id);
  const healthMap = await getBatchTenantHealth(tenantIds);

  const summaries = tenants.map(tenant => {
    const health = healthMap.get(tenant.id);
    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      healthScore: health?.healthScore ?? 0,
      plan: health?.plan ?? 'TRIAL',
      alertCount: health?.alerts.length ?? 0,
    };
  });

  // Calculate summary
  const healthyCount = summaries.filter(s => s.healthScore >= 80).length;
  const warningCount = summaries.filter(s => s.healthScore >= 50 && s.healthScore < 80).length;
  const criticalCount = summaries.filter(s => s.healthScore < 50).length;

  return {
    tenants: summaries,
    summary: {
      total: summaries.length,
      healthy: healthyCount,
      warning: warningCount,
      critical: criticalCount,
      avgHealthScore: Math.round(
        summaries.reduce((sum, s) => sum + s.healthScore, 0) / summaries.length
      ),
    },
  };
}
```

#### Verification
- Test with 10 tenants, verify ~6 queries total (not 110+)
- Measure response time (expect 90%+ improvement)

---

### 1.4 Optimize Account Stats Query

**File:** `pmo/apps/api/src/crm/services/account.service.ts`
**Function:** `getAccountStats()` (Lines 517-591)
**Priority:** MODERATE
**Estimated Effort:** 3 hours

#### Current Implementation Problem

7 separate count queries for health score distribution:

```typescript
// CURRENT: 7 parallel count queries
const [
  totalAccounts,
  byType,
  healthyCount,     // count where health >= 80
  atRiskCount,      // count where health 50-79
  criticalCount,    // count where health < 50
  unknownHealth,    // count where health null
  recentlyEngaged,  // count with activities EXISTS
] = await Promise.all([...]);
```

#### Implementation Steps

**Step 1:** Replace individual counts with single query + in-memory aggregation
```typescript
export async function getAccountStats(tenantId: string): Promise<AccountStats> {
  // Single query to get all accounts with health scores
  const accounts = await prisma.account.findMany({
    where: { tenantId, isArchived: false },
    select: {
      id: true,
      type: true,
      healthScore: true,
      _count: {
        select: {
          activities: {
            where: {
              createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
          }
        }
      }
    },
  });

  // Calculate all stats in single pass
  let healthyCount = 0;
  let atRiskCount = 0;
  let criticalCount = 0;
  let unknownHealthCount = 0;
  let recentlyEngagedCount = 0;
  const byType: Record<string, number> = {};

  for (const account of accounts) {
    // Health distribution
    if (account.healthScore === null) {
      unknownHealthCount++;
    } else if (account.healthScore >= 80) {
      healthyCount++;
    } else if (account.healthScore >= 50) {
      atRiskCount++;
    } else {
      criticalCount++;
    }

    // Type distribution
    byType[account.type] = (byType[account.type] ?? 0) + 1;

    // Recently engaged
    if (account._count.activities > 0) {
      recentlyEngagedCount++;
    }
  }

  return {
    totalAccounts: accounts.length,
    byType,
    healthDistribution: {
      healthy: healthyCount,
      atRisk: atRiskCount,
      critical: criticalCount,
      unknown: unknownHealthCount,
    },
    recentlyEngaged: recentlyEngagedCount,
  };
}
```

#### Verification
- Test shows 1-2 queries instead of 7
- Response time improves by ~70%

---

## Phase 2: React Query & Context Optimization (Week 1)

### 2.1 Add React Query Cache Configuration

**File:** `pmo/apps/web/src/api/hooks/crm/index.ts`
**Priority:** CRITICAL
**Estimated Effort:** 2 hours

#### Implementation Steps

**Step 1:** Define cache configuration constants at top of file
```typescript
// pmo/apps/web/src/api/hooks/crm/index.ts

/**
 * Cache configuration for CRM queries
 * - staleTime: How long data is considered fresh (no refetch)
 * - gcTime: How long inactive data stays in cache
 */
const CRM_CACHE_CONFIG = {
  // List data - stale after 30 seconds, cache for 5 minutes
  list: {
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  // Detail data - stale after 1 minute, cache for 10 minutes
  detail: {
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  // Stats data - stale after 2 minutes, cache for 10 minutes
  stats: {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
} as const;
```

**Step 2:** Update all useQuery hooks to use cache config
```typescript
export function useAccounts(
  filters?: AccountFilters,
): UseQueryResult<PaginatedAccounts, Error> {
  return useQuery({
    queryKey: queryKeys.accounts.list(filters),
    queryFn: () => fetchAccounts(filters),
    staleTime: CRM_CACHE_CONFIG.list.staleTime,
    gcTime: CRM_CACHE_CONFIG.list.gcTime,
  });
}

export function useAccount(id?: number): UseQueryResult<Account, Error> {
  return useQuery({
    queryKey: id ? queryKeys.accounts.detail(id) : queryKeys.accounts.all,
    enabled: Boolean(id),
    queryFn: () => fetchAccountById(id as number),
    staleTime: CRM_CACHE_CONFIG.detail.staleTime,
    gcTime: CRM_CACHE_CONFIG.detail.gcTime,
  });
}

export function useAccountStats(): UseQueryResult<AccountStats, Error> {
  return useQuery({
    queryKey: queryKeys.accounts.stats(),
    queryFn: fetchAccountStats,
    staleTime: CRM_CACHE_CONFIG.stats.staleTime,
    gcTime: CRM_CACHE_CONFIG.stats.gcTime,
  });
}

// ... Apply to all other hooks: useOpportunities, useOpportunity,
// usePipelineStats, useClosingSoon
```

**Step 3:** Apply to other hook files
- `pmo/apps/web/src/api/hooks/useFinance.ts` (already has some config)
- `pmo/apps/web/src/api/hooks/clients.ts`
- `pmo/apps/web/src/api/hooks/projects.ts`
- `pmo/apps/web/src/api/hooks/tasks.ts`

#### Verification
- Open React Query DevTools
- Navigate between pages, verify data loads from cache
- Verify network requests reduced by ~50%

---

### 2.2 Memoize Context Provider Values

**File:** `pmo/apps/web/src/ui/Tabs.tsx`
**Priority:** HIGH
**Estimated Effort:** 30 minutes

#### Implementation Steps

**Step 1:** Add useMemo import
```typescript
import React, { createContext, useContext, useState, useMemo } from 'react';
```

**Step 2:** Wrap context value in useMemo
```typescript
export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);

  const activeTab = controlledValue ?? internalValue;
  const setActiveTab = useCallback((newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  }, [controlledValue, onValueChange]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({ activeTab, setActiveTab }),
    [activeTab, setActiveTab]
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}
```

---

**File:** `pmo/apps/web/src/ui/Toast.tsx`
**Priority:** HIGH
**Estimated Effort:** 30 minutes

#### Implementation Steps

**Step 1:** Add useMemo import (already has useCallback)
```typescript
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
```

**Step 2:** Wrap context value in useMemo
```typescript
export function ToastProvider({ children }: ToastProviderProps): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      // ... existing implementation
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Memoize context value
  const contextValue = useMemo(
    () => ({ showToast }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* ... rest of component */}
    </ToastContext.Provider>
  );
}
```

---

### 2.3 Fix ClientProjectContext Missing Dependency

**File:** `pmo/apps/web/src/pages/ClientProjectContext.tsx`
**Priority:** MEDIUM
**Estimated Effort:** 15 minutes

#### Implementation Steps

```typescript
// Move reset inside useMemo to ensure stable reference
const value = useMemo(() => {
  const reset = () => {
    setSelectedAccount(null);
    setSelectedProject(null);
  };

  return {
    selectedAccount,
    setSelectedAccount,
    selectedProject,
    setSelectedProject,
    reset,
  };
}, [selectedAccount, selectedProject]);
```

---

## Phase 3: Component Memoization (Week 2)

### 3.1 Add React.memo to TaskKanbanCard

**File:** `pmo/apps/web/src/components/TaskKanbanCard.tsx`
**Priority:** HIGH
**Estimated Effort:** 1 hour

#### Implementation Steps

**Step 1:** Wrap component with React.memo
```typescript
import React, { memo } from 'react';

// ... helper functions stay outside

export const TaskKanbanCard = memo(function TaskKanbanCard({
  task,
  onDelete,
}: TaskKanbanCardProps): JSX.Element {
  // ... existing implementation unchanged
});

// Add custom comparison if needed for deep object comparison
TaskKanbanCard.displayName = 'TaskKanbanCard';
```

**Step 2:** Ensure parent components pass stable callbacks
```typescript
// In TaskKanbanBoard.tsx or parent component
const handleDeleteTask = useCallback((taskId: number) => {
  deleteTaskMutation.mutate(taskId);
}, [deleteTaskMutation]);
```

---

### 3.2 Add React.memo to ToastItem

**File:** `pmo/apps/web/src/ui/Toast.tsx`
**Priority:** HIGH
**Estimated Effort:** 30 minutes

#### Implementation Steps

```typescript
import React, { memo } from 'react';

// ... existing code

const ToastItem = memo(function ToastItem({ toast, onClose }: ToastItemProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex items-start gap-3 min-w-[320px] p-4 rounded-lg border shadow-lg',
        'animate-in slide-in-from-right duration-300',
        variantStyles[toast.variant],
      )}
      role="alert"
    >
      {/* ... existing JSX */}
    </div>
  );
});

ToastItem.displayName = 'ToastItem';
```

---

### 3.3 Add React.memo to BudgetActions

**File:** `pmo/apps/web/src/pages/finance/BudgetsPage.tsx`
**Priority:** MEDIUM
**Estimated Effort:** 30 minutes

#### Implementation Steps

```typescript
import React, { memo, useCallback } from 'react';

// Extract and memoize the component
const BudgetActions = memo(function BudgetActions({
  budget,
  onDelete
}: BudgetActionsProps) {
  return (
    <div className="flex gap-2">
      {/* ... existing JSX */}
    </div>
  );
});

BudgetActions.displayName = 'BudgetActions';

// In parent, ensure stable callback
const handleDeleteBudget = useCallback((id: number) => {
  deleteBudgetMutation.mutate(id);
}, [deleteBudgetMutation]);
```

---

### 3.4 Convert Inline Handlers to useCallback

**Files to update:**
- `pmo/apps/web/src/pages/ProjectDashboardPage.tsx`
- `pmo/apps/web/src/features/ai-assistant/AIAssistantSidebar.tsx`
- `pmo/apps/web/src/pages/finance/ExpensesPage.tsx`

**Priority:** HIGH
**Estimated Effort:** 4 hours total

#### Implementation Pattern

**Example for ProjectDashboardPage.tsx:**

```typescript
// BEFORE (Line 560-565)
onClick={() => {
  setShowStatusEditor(false);
  setEditedStatus(project.status);
  setEditedStartDate(project.startDate?.slice(0, 10) ?? '');
  setEditedEndDate(project.endDate?.slice(0, 10) ?? '');
}}

// AFTER
const handleCancelStatusEdit = useCallback(() => {
  setShowStatusEditor(false);
  setEditedStatus(project.status);
  setEditedStartDate(project.startDate?.slice(0, 10) ?? '');
  setEditedEndDate(project.endDate?.slice(0, 10) ?? '');
}, [project.status, project.startDate, project.endDate]);

// Usage
onClick={handleCancelStatusEdit}
```

**Example for AIAssistantSidebar.tsx:**

```typescript
// BEFORE (Line 289)
onClick={() => handleQuickAction(suggestion)}

// AFTER
// Move suggestions to constant outside component
const QUICK_SUGGESTIONS = [
  'What are my at-risk projects?',
  'Prepare me for my meeting with client #1',
  'Show recent meetings',
] as const;

// In component
const handleSuggestionClick = useCallback((suggestion: string) => {
  handleQuickAction(suggestion);
}, [handleQuickAction]);

// Usage
{QUICK_SUGGESTIONS.map((suggestion) => (
  <button
    key={suggestion}
    onClick={() => handleSuggestionClick(suggestion)}
    className="..."
  >
    {suggestion}
  </button>
))}
```

---

## Phase 4: Algorithm Optimization (Week 2)

### 4.1 Fix String Concatenation in generateMarkdownSummary

**File:** `pmo/apps/api/src/services/projectStatus.service.ts`
**Function:** `generateMarkdownSummary()` (Lines 348-374)
**Priority:** HIGH
**Estimated Effort:** 1 hour

#### Implementation Steps

```typescript
function generateMarkdownSummary(data: StatusSummaryResponse): string {
  const parts: string[] = [];

  const statusMap: Record<string, string> = {
    ON_TRACK: 'On Track',
    AT_RISK: 'At Risk',
    OFF_TRACK: 'Off Track',
  };

  parts.push(`## Status Report – ${data.projectName}`);
  parts.push('');
  parts.push(`**Status:** ${statusMap[data.healthStatus]}`);
  parts.push(`**Period:** ${formatDate(data.from)} → ${formatDate(data.to)}`);
  parts.push('');

  if (data.completedTasks.length > 0) {
    parts.push('### Completed');
    for (const task of data.completedTasks) {
      parts.push(`- ${task.title} (Done ${formatDate(task.completedAt)})`);
    }
    parts.push('');
  }

  if (data.upcomingTasks.length > 0) {
    parts.push('### Upcoming');
    for (const task of data.upcomingTasks) {
      parts.push(`- ${task.title} (Due ${formatDate(task.dueDate)})`);
    }
    parts.push('');
  }

  if (data.upcomingMilestones.length > 0) {
    parts.push('### Milestones');
    for (const milestone of data.upcomingMilestones) {
      parts.push(`- ${milestone.name} (Due ${formatDate(milestone.dueDate)})`);
    }
  }

  return parts.join('\n');
}
```

---

### 4.2 Single-Pass Task Processing in getProjectStatus

**File:** `pmo/apps/api/src/services/projectStatus.service.ts`
**Function:** `getProjectStatus()` (Lines 95-157)
**Priority:** MEDIUM
**Estimated Effort:** 2 hours

#### Implementation Steps

```typescript
// Replace multiple filter passes with single loop
interface TaskAggregation {
  byCounts: Record<string, number>;
  overdue: Array<{ id: number; title: string; dueDate: string; status: string }>;
  upcoming: Array<{ id: number; title: string; dueDate: string; status: string }>;
}

function aggregateTasks(
  tasks: Task[],
  today: Date,
  upcomingDate: Date
): TaskAggregation {
  const result: TaskAggregation = {
    byCounts: {},
    overdue: [],
    upcoming: [],
  };

  // Initialize counts for all statuses
  for (const status of Object.values(TaskStatus)) {
    result.byCounts[status] = 0;
  }

  // Single pass through tasks
  for (const task of tasks) {
    // Count by status
    result.byCounts[task.status]++;

    // Check for overdue/upcoming only if has due date and not done
    if (task.dueDate && task.status !== TaskStatus.DONE) {
      const dueDate = new Date(task.dueDate);
      const taskInfo = {
        id: task.id,
        title: task.title,
        dueDate: task.dueDate.toISOString(),
        status: task.status,
      };

      if (dueDate < today) {
        result.overdue.push(taskInfo);
      } else if (dueDate <= upcomingDate) {
        result.upcoming.push(taskInfo);
      }
    }
  }

  // Limit results
  result.overdue = result.overdue.slice(0, 10);
  result.upcoming = result.upcoming.slice(0, 10);

  return result;
}

// Usage in getProjectStatus:
const taskAggregation = aggregateTasks(project.tasks, today, upcomingDate);
const taskCounts = taskAggregation.byCounts;
const overdueTasks = taskAggregation.overdue;
const upcomingTasks = taskAggregation.upcoming;
```

---

### 4.3 Parallelize Health Score Calculations

**File:** `pmo/apps/api/src/modules/customer-success/health-score.service.ts`
**Function:** `autoCalculateHealthScore()` (Lines 298-313)
**Priority:** MEDIUM
**Estimated Effort:** 1 hour

#### Implementation Steps

```typescript
export async function autoCalculateHealthScore(
  clientId: number,
  projectId?: number,
): Promise<HealthScoreResult> {
  // Execute all independent calculations in parallel
  const [engagementScore, supportScore, sentimentScore, usageScore] =
    await Promise.all([
      calculateEngagementScoreFromData(clientId, projectId),
      calculateSupportScoreFromData(clientId, projectId),
      calculateSentimentScoreFromData(clientId, projectId),
      calculateUsageScoreFromData(clientId, projectId),
    ]);

  return calculateHealthScore({
    engagementScore,
    supportScore,
    sentimentScore,
    usageScore,
  });
}
```

---

### 4.4 Optimize Content Lint Regex Matching

**File:** `pmo/apps/api/src/services/content-lint.service.ts`
**Function:** `lintMarketingContent()` (Lines 102-204)
**Priority:** MEDIUM
**Estimated Effort:** 2 hours

#### Implementation Steps

```typescript
// Combine all patterns into categorized groups
const LINT_PATTERNS = {
  errors: {
    guarantees: [/* patterns */],
  },
  warnings: {
    exaggeration: [/* patterns */],
    urgency: [/* patterns */],
  },
  info: {
    informal: [/* patterns */],
  },
};

// Pre-compile combined regex for each severity
const compiledPatterns = {
  errors: new Map<string, RegExp>(),
  warnings: new Map<string, RegExp>(),
  info: new Map<string, RegExp>(),
};

// Initialize once at module load
for (const [severity, categories] of Object.entries(LINT_PATTERNS)) {
  for (const [category, patterns] of Object.entries(categories)) {
    // Combine patterns into single regex with named groups
    const combined = new RegExp(
      patterns.map((p, i) => `(?<${category}_${i}>${p.source})`).join('|'),
      'gi'
    );
    compiledPatterns[severity as keyof typeof compiledPatterns].set(category, combined);
  }
}

// Single-pass matching function
export function lintMarketingContent(content: string): LintResult {
  const errors: LintIssue[] = [];
  const warnings: LintIssue[] = [];
  const info: LintIssue[] = [];

  // Single pass for errors
  for (const [category, pattern] of compiledPatterns.errors) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      errors.push({
        category,
        match: match[0],
        position: match.index,
      });
    }
  }

  // Single pass for warnings
  for (const [category, pattern] of compiledPatterns.warnings) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      warnings.push({
        category,
        match: match[0],
        position: match.index,
      });
    }
  }

  // ... similar for info

  return { errors, warnings, info };
}
```

---

## Phase 5: Advanced Optimizations (Week 3-4)

### 5.1 Implement List Virtualization

**Files:**
- `pmo/apps/web/src/pages/crm/OpportunitiesPage.tsx`
- `pmo/apps/web/src/pages/crm/AccountsPage.tsx`
- `pmo/apps/web/src/pages/finance/ExpensesPage.tsx`

**Priority:** MEDIUM
**Estimated Effort:** 8 hours total

#### Implementation Steps

**Step 1:** Install react-window
```bash
cd pmo && npm install react-window @types/react-window --workspace pmo-web
```

**Step 2:** Create reusable VirtualizedList component
```typescript
// pmo/apps/web/src/components/VirtualizedList.tsx
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { memo, useCallback } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function VirtualizedList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  className,
}: VirtualizedListProps<T>) {
  const Row = useCallback(
    ({ index, style }: ListChildComponentProps) => (
      <div style={style}>{renderItem(items[index], index)}</div>
    ),
    [items, renderItem]
  );

  return (
    <FixedSizeList
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      width="100%"
      className={className}
    >
      {Row}
    </FixedSizeList>
  );
}
```

**Step 3:** Apply to OpportunitiesPage
```typescript
// Only virtualize if list is large
const VIRTUALIZATION_THRESHOLD = 50;

// In component:
{opportunities.length > VIRTUALIZATION_THRESHOLD ? (
  <VirtualizedList
    items={opportunities}
    height={600}
    itemHeight={80}
    renderItem={(opp, index) => (
      <OpportunityRow key={opp.id} opportunity={opp} />
    )}
  />
) : (
  // Regular mapping for small lists
  opportunities.map((opp) => (
    <OpportunityRow key={opp.id} opportunity={opp} />
  ))
)}
```

---

### 5.2 Add AbortController Support

**File:** `pmo/apps/web/src/api/http.ts`
**Priority:** MEDIUM
**Estimated Effort:** 2 hours

#### Implementation Steps

**Step 1:** Create abort-aware fetch wrapper
```typescript
// pmo/apps/web/src/api/http.ts

interface FetchOptions extends RequestInit {
  timeout?: number;
}

export async function fetchWithAbort<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { timeout = 30000, signal: externalSignal, ...fetchOptions } = options;

  // Create abort controller for timeout
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

  // Combine signals if external signal provided
  const signal = externalSignal
    ? anySignal([externalSignal, timeoutController.signal])
    : timeoutController.signal;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal,
      credentials: 'include',
    });

    clearTimeout(timeoutId);
    return handleResponse<T>(response);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request was cancelled or timed out');
    }
    throw error;
  }
}

// Helper to combine multiple AbortSignals
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}
```

**Step 2:** Update React Query hooks to use AbortSignal
```typescript
export function useAccounts(filters?: AccountFilters) {
  return useQuery({
    queryKey: queryKeys.accounts.list(filters),
    queryFn: ({ signal }) => fetchAccounts(filters, { signal }),
    staleTime: CRM_CACHE_CONFIG.list.staleTime,
    gcTime: CRM_CACHE_CONFIG.list.gcTime,
  });
}

// Update fetchAccounts to accept signal
export async function fetchAccounts(
  filters?: AccountFilters,
  options?: { signal?: AbortSignal }
): Promise<PaginatedAccounts> {
  return fetchWithAbort<PaginatedAccounts>(
    buildUrl('/api/crm/accounts', filters),
    { signal: options?.signal }
  );
}
```

---

### 5.3 Server-Side Filtering for Opportunities

**File:** `pmo/apps/web/src/pages/crm/OpportunitiesPage.tsx`
**Priority:** MEDIUM
**Estimated Effort:** 3 hours

#### Implementation Steps

**Step 1:** Update filter params to include stageType
```typescript
// Current (Lines 81-85) - Client-side filtering
const opportunities = useMemo(() => {
  const data = opportunitiesQuery.data?.data ?? [];
  if (!filters.stageType) return data;
  return data.filter((opp) => opp.stage?.stageType === filters.stageType);
}, [opportunitiesQuery.data, filters.stageType]);

// AFTER - Server-side filtering
const filterParams = useMemo(() => ({
  ...filters,
  stageType: filters.stageType, // Now sent to server
}), [filters]);

const opportunitiesQuery = useOpportunities(filterParams);
const opportunities = opportunitiesQuery.data?.data ?? [];
```

**Step 2:** Update backend to support stageType filter
```typescript
// pmo/apps/api/src/crm/services/opportunity.service.ts

interface OpportunityFilters {
  // ... existing filters
  stageType?: 'OPEN' | 'WON' | 'LOST';
}

export async function listOpportunities(
  tenantId: string,
  filters: OpportunityFilters
): Promise<PaginatedOpportunities> {
  const where: Prisma.OpportunityWhereInput = {
    tenantId,
    // Add stageType filter
    ...(filters.stageType && {
      stage: { stageType: filters.stageType },
    }),
  };

  // ... rest of implementation
}
```

---

## Phase 6: Low Priority Fixes (Backlog)

### 6.1 Fix Spread Operator in Reduce

**File:** `pmo/apps/api/src/services/audit.service.ts`
**Lines:** 215-223
**Estimated Effort:** 30 minutes

```typescript
// BEFORE
const byAction: Record<string, number> = stats.reduce(
  (acc, s) => ({ ...acc, [s.action]: s._count.id }),
  {} as Record<string, number>,
);

// AFTER
const byAction: Record<string, number> = {};
for (const s of stats) {
  byAction[s.action] = s._count.id;
}
```

---

### 6.2 Replace JSON.stringify Comparison

**File:** `pmo/apps/api/src/services/audit.service.ts`
**Line:** 243
**Estimated Effort:** 30 minutes

```typescript
// Install fast-deep-equal
// npm install fast-deep-equal

import equal from 'fast-deep-equal';

// BEFORE
if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
  continue;
}

// AFTER
if (equal(beforeValue, afterValue)) {
  continue;
}
```

---

### 6.3 Batch State Updates in LeadsPage

**File:** `pmo/apps/web/src/pages/LeadsPage.tsx`
**Lines:** 70-85
**Estimated Effort:** 1 hour

```typescript
// Option 1: Use useReducer for related state
interface ModalState {
  isOpen: boolean;
  editingMeeting: Meeting | null;
  formValues: FormValues;
  error: string | null;
}

const [modalState, dispatch] = useReducer(modalReducer, initialState);

const handleOpenEdit = (meeting: Meeting) => {
  dispatch({ type: 'OPEN_EDIT', payload: meeting });
};

// Option 2: Use unstable_batchedUpdates (React 17) or flushSync
import { unstable_batchedUpdates } from 'react-dom';

const handleOpenEdit = (meeting: Meeting) => {
  unstable_batchedUpdates(() => {
    setEditingMeeting(meeting);
    setModalValues(toFormValues(meeting));
    setFormError(null);
    setShowModal(true);
  });
};
```

---

## Testing & Verification Strategy

### Backend Performance Testing

```typescript
// pmo/apps/api/test/performance/n-plus-one.test.ts

import { PrismaClient } from '@prisma/client';

describe('N+1 Query Prevention', () => {
  let queryCount = 0;

  beforeEach(() => {
    queryCount = 0;
    // Add Prisma middleware to count queries
    prisma.$use(async (params, next) => {
      queryCount++;
      return next(params);
    });
  });

  describe('getCSMPerformanceMetrics', () => {
    it('should not increase queries linearly with user count', async () => {
      // Create 10 test users with CTAs and success plans
      await createTestUsers(10);

      const startCount = queryCount;
      await getCSMPerformanceMetrics();
      const totalQueries = queryCount - startCount;

      // Should be O(1) queries, not O(n)
      expect(totalQueries).toBeLessThan(15); // Allow some constant overhead
    });
  });

  describe('getAllTenantsHealth', () => {
    it('should batch all tenant health queries', async () => {
      await createTestTenants(5);

      const startCount = queryCount;
      await getAllTenantsHealth();
      const totalQueries = queryCount - startCount;

      // Should be ~6-8 queries, not 55+ (5 tenants × 11 queries)
      expect(totalQueries).toBeLessThan(15);
    });
  });
});
```

### Frontend Performance Testing

```typescript
// pmo/apps/web/test/performance/re-renders.test.tsx

import { render } from '@testing-library/react';
import { Profiler } from 'react';

describe('Re-render Prevention', () => {
  let renderCount = 0;

  const onRender = () => {
    renderCount++;
  };

  beforeEach(() => {
    renderCount = 0;
  });

  it('TabsTrigger should not re-render when sibling changes', () => {
    const { rerender } = render(
      <Profiler id="tabs" onRender={onRender}>
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>
      </Profiler>
    );

    const initialRenderCount = renderCount;

    // Simulate parent re-render
    rerender(/* same component */);

    // Should not cause additional renders
    expect(renderCount).toBe(initialRenderCount);
  });

  it('TaskKanbanCard should not re-render with same props', () => {
    const task = { id: 1, title: 'Test', status: 'TODO' };
    const onDelete = jest.fn();

    const { rerender } = render(
      <Profiler id="card" onRender={onRender}>
        <TaskKanbanCard task={task} onDelete={onDelete} />
      </Profiler>
    );

    const initialRenderCount = renderCount;

    // Re-render with same task reference
    rerender(
      <Profiler id="card" onRender={onRender}>
        <TaskKanbanCard task={task} onDelete={onDelete} />
      </Profiler>
    );

    expect(renderCount).toBe(initialRenderCount);
  });
});
```

### API Response Time Benchmarks

```bash
# Create benchmark script
# pmo/scripts/benchmark-api.sh

#!/bin/bash

echo "Benchmarking API endpoints..."

# CSM Performance Metrics
echo "CSM Performance Metrics:"
time curl -s http://localhost:3001/api/customer-success/analytics/csm-performance > /dev/null
time curl -s http://localhost:3001/api/customer-success/analytics/csm-performance > /dev/null
time curl -s http://localhost:3001/api/customer-success/analytics/csm-performance > /dev/null

# Account Stats
echo "Account Stats:"
time curl -s http://localhost:3001/api/crm/accounts/stats > /dev/null

# Tenant Health
echo "All Tenants Health:"
time curl -s http://localhost:3001/api/admin/tenants/health > /dev/null
```

---

## Rollout Checklist

### Pre-Deployment
- [ ] All unit tests pass
- [ ] Performance tests verify query count reduction
- [ ] API response time benchmarks show improvement
- [ ] React DevTools profiler shows reduced re-renders
- [ ] No TypeScript errors
- [ ] Lint passes

### Deployment Order
1. **Phase 1** - Deploy backend N+1 fixes first (can deploy independently)
2. **Phase 2** - Deploy React Query cache config (safe, additive change)
3. **Phase 3** - Deploy component memoization (safe, no behavior change)
4. **Phase 4** - Deploy algorithm optimizations (test thoroughly)
5. **Phase 5** - Deploy advanced optimizations (feature flag recommended)
6. **Phase 6** - Deploy low priority fixes (batch with other changes)

### Post-Deployment Monitoring
- [ ] Monitor API response times in production
- [ ] Check error rates for affected endpoints
- [ ] Monitor database query count/time
- [ ] Verify React Query cache hit rates
- [ ] Check for memory leaks in frontend

---

## Summary

| Phase | Issues Fixed | Effort | Expected Improvement |
|-------|-------------|--------|---------------------|
| Phase 1 | 5 N+1 patterns | 15h | 80-90% API response time reduction |
| Phase 2 | 4 cache/context issues | 3h | 50% fewer network requests |
| Phase 3 | 4 memo issues | 6h | 30% fewer re-renders |
| Phase 4 | 4 algorithm issues | 6h | 5-10x faster processing |
| Phase 5 | 3 advanced issues | 13h | Handles 10x more data |
| Phase 6 | 3 minor issues | 2h | Minor improvements |
| **Total** | **28 issues** | **45h** | **40-60% overall improvement** |
