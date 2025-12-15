# API Test Refactoring Plan

## Executive Summary

This document provides a comprehensive analysis of the current API test infrastructure and a detailed plan to resolve Prisma/Tenant failures. The core issues stem from **inconsistent tenant context handling** across legacy PMO tests, **dual Prisma client usage**, and **missing tenant associations** in route tests.

---

## 1. Current Test Architecture Analysis

### 1.1 Test File Inventory

| Test File                       | Lines | Category     | Tenant-Aware?           |
| ------------------------------- | ----- | ------------ | ----------------------- |
| `auth.routes.test.ts`           | 178   | Auth         | ✅ (no tenant needed)   |
| `auth.middleware.test.ts`       | 53    | Auth         | ✅ (no tenant needed)   |
| `role.middleware.test.ts`       | 184   | Auth         | ✅ (no tenant needed)   |
| `rate-limit.middleware.test.ts` | 152   | Middleware   | ✅ (no tenant needed)   |
| `password.test.ts`              | 22    | Utils        | ✅ (no tenant needed)   |
| `projects.routes.test.ts`       | 371   | PMO Routes   | ❌ **BROKEN**           |
| `task.routes.test.ts`           | 110   | PMO Routes   | ❌ **BROKEN**           |
| `milestone.routes.test.ts`      | 97    | PMO Routes   | ❌ **BROKEN**           |
| `clients.routes.test.ts`        | 129   | PMO Routes   | ❌ **BROKEN**           |
| `meetings.routes.test.ts`       | 158   | PMO Routes   | ❌ **BROKEN**           |
| `meetings.service.test.ts`      | 186   | PMO Services | ❌ **BROKEN**           |
| `tenant-isolation.test.ts`      | 469   | CRM/Tenant   | ✅ Properly implemented |
| `api-tenant-isolation.test.ts`  | 322   | CRM/Tenant   | ✅ Properly implemented |

### 1.2 Infrastructure Files

| File                         | Purpose                                                         |
| ---------------------------- | --------------------------------------------------------------- |
| `globalSetup.ts`             | Generates Prisma client before tests                            |
| `setup.ts`                   | Creates test database, runs migrations, cleans up between tests |
| `utils/tenant-test-utils.ts` | Helpers for tenant context testing                              |

---

## 2. Root Cause Analysis

### 2.1 Issue #1: Dual Prisma Client Problem

**Location:** `test/utils/tenant-test-utils.ts:12`

```typescript
// PROBLEM: Creates a raw PrismaClient WITHOUT tenant extension
const testPrisma = new PrismaClient();
```

**Impact:**

- `testPrisma` bypasses all tenant filtering
- Creates data without automatic tenant injection
- Queries return cross-tenant data

**Conflict with:**

- `src/prisma/client.ts` exports the extended Prisma client with tenant filtering
- Services use the extended client
- Mixed usage causes inconsistent behavior

### 2.2 Issue #2: Legacy PMO Tests Missing Tenant Context

**Affected Files:**

- `projects.routes.test.ts`
- `task.routes.test.ts`
- `milestone.routes.test.ts`
- `clients.routes.test.ts`
- `meetings.routes.test.ts`
- `meetings.service.test.ts`

**Pattern in these files:**

```typescript
// Creates user without tenant association
const user = await prisma.user.create({...});

// Creates client/project without proper tenant context
const client = await prisma.client.create({...});  // Missing tenantId!

// Makes API request without tenant header
await agent.post('/api/projects').send({...});  // Missing X-Tenant-ID!
```

**Root Cause:**
The `Client`, `Project`, `Task`, `Milestone`, and `Meeting` models are ALL listed in `TENANT_SCOPED_MODELS` in `tenant-extension.ts`. This means:

1. When creating without tenant context → tenantId is not injected
2. When querying without tenant context → no tenant filter applied
3. When API requests don't have tenant header → middleware doesn't establish context

### 2.3 Issue #3: Inconsistent Tenant Creation Patterns

**`projects.routes.test.ts` pattern:**

```typescript
const createClient = async (ownerId: number) => {
  // Creates tenant with timestamp-based ID
  const tenant = await prisma.tenant.create({
    data: {
      id: `test-tenant-${Date.now()}`, // NOT matching cleanup pattern!
      name: 'Test Tenant',
      slug: `test-tenant-${Date.now()}`,
    },
  });
  // ...
};
```

**Cleanup pattern in `setup.ts`:**

```typescript
// Only skips tenants with these slug patterns:
const testTenants = await prismaClient.tenant.findMany({
  where: {
    OR: [
      { slug: { startsWith: 'test-tenant-' } }, // Matches, but...
      { slug: { startsWith: 'test-tenant-api-' } },
    ],
  },
});
```

**Problem:** While the cleanup DOES find these tenants, other tests may be affected by partial cleanup ordering or race conditions.

### 2.4 Issue #4: Missing User-Tenant Associations

**Current broken pattern:**

```typescript
const createAuthenticatedAgent = async () => {
  const user = await prisma.user.create({...});  // User created
  // BUT: No TenantUser record created!
  // User is NOT associated with any tenant

  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({...});
  // Login succeeds but tenant middleware can't determine tenant!

  return { agent, user };
};
```

**Required pattern (from working tests):**

```typescript
// From api-tenant-isolation.test.ts
const user = await createTestUser(...);
await addUserToTenant(tenant.id, user.id, 'ADMIN');  // MISSING in legacy tests!
const token = signToken({ userId: user.id });
// Then use X-Tenant-ID header
```

### 2.5 Issue #5: Route Tests Not Sending Tenant Headers

**Broken pattern:**

```typescript
const response = await agent.post('/api/projects').send({...});
// Missing: .set('X-Tenant-ID', tenant.id)
```

**Working pattern (from api-tenant-isolation.test.ts):**

```typescript
const res = await request(app)
  .post('/api/crm/accounts')
  .set('Cookie', `token=${tokenA}`)
  .set('X-Tenant-ID', tenantA.id)  // REQUIRED!
  .send({...});
```

---

## 3. Refactoring Plan

### 3.1 Phase 1: Unify Prisma Client Usage

**Goal:** Eliminate dual Prisma client problem

**Changes to `test/utils/tenant-test-utils.ts`:**

```typescript
// BEFORE
const testPrisma = new PrismaClient();

// AFTER
import { prisma as extendedPrisma } from '../../src/prisma/client';
import { PrismaClient } from '@prisma/client';

// Use raw client ONLY for setup/cleanup that needs to bypass tenant filtering
const rawPrisma = new PrismaClient();

// Export both for different use cases
export function getTestPrisma() {
  return rawPrisma; // For cross-tenant setup/cleanup
}

export function getTenantAwarePrisma() {
  return extendedPrisma; // For testing with tenant context
}
```

**Rationale:**

- Raw Prisma client needed for cross-tenant test setup (creating tenants, users, etc.)
- Extended Prisma client needed for testing actual service behavior
- Clear distinction prevents confusion

### 3.2 Phase 2: Create Shared Test Fixtures

**Create new file: `test/utils/test-fixtures.ts`**

```typescript
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../src/auth/password';
import { signToken } from '../../src/auth/jwt';

const rawPrisma = new PrismaClient();

/**
 * Create a complete test environment with tenant, user, and proper associations
 */
export async function createTestEnvironment(
  suffix: string = Date.now().toString(),
) {
  // 1. Create tenant
  const tenant = await rawPrisma.tenant.create({
    data: {
      id: `test-tenant-${suffix}`,
      name: `Test Tenant ${suffix}`,
      slug: `test-tenant-${suffix}`,
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
    },
  });

  // 2. Create user
  const passwordHash = await hashPassword('password123');
  const user = await rawPrisma.user.create({
    data: {
      name: `Test User ${suffix}`,
      email: `test-${suffix}@example.com`,
      passwordHash,
      timezone: 'UTC',
    },
  });

  // 3. Associate user with tenant (CRITICAL!)
  await rawPrisma.tenantUser.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      role: 'ADMIN',
      acceptedAt: new Date(),
    },
  });

  // 4. Generate JWT token
  const token = signToken({ userId: user.id });

  // 5. Create default pipeline for CRM tests
  const pipeline = await rawPrisma.pipeline.create({
    data: {
      tenantId: tenant.id,
      name: 'Default Pipeline',
      isDefault: true,
      isActive: true,
      stages: {
        create: [
          { name: 'Lead', order: 0, probability: 10, type: 'OPEN' },
          { name: 'Won', order: 1, probability: 100, type: 'WON' },
          { name: 'Lost', order: 2, probability: 0, type: 'LOST' },
        ],
      },
    },
    include: { stages: true },
  });

  return { tenant, user, token, pipeline, password: 'password123' };
}

/**
 * Create authenticated supertest agent with tenant context
 */
export function createTenantAgent(
  app: Express.Application,
  token: string,
  tenantId: string,
) {
  return {
    get: (url: string) =>
      request(app)
        .get(url)
        .set('Cookie', `token=${token}`)
        .set('X-Tenant-ID', tenantId),
    post: (url: string) =>
      request(app)
        .post(url)
        .set('Cookie', `token=${token}`)
        .set('X-Tenant-ID', tenantId),
    put: (url: string) =>
      request(app)
        .put(url)
        .set('Cookie', `token=${token}`)
        .set('X-Tenant-ID', tenantId),
    patch: (url: string) =>
      request(app)
        .patch(url)
        .set('Cookie', `token=${token}`)
        .set('X-Tenant-ID', tenantId),
    delete: (url: string) =>
      request(app)
        .delete(url)
        .set('Cookie', `token=${token}`)
        .set('X-Tenant-ID', tenantId),
  };
}

/**
 * Clean up test environment
 */
export async function cleanupTestEnvironment(tenantId: string) {
  // Delete in order respecting foreign keys
  await rawPrisma.task.deleteMany({
    where: { project: { tenant: { id: tenantId } } },
  });
  await rawPrisma.milestone.deleteMany({
    where: { project: { tenant: { id: tenantId } } },
  });
  await rawPrisma.meeting.deleteMany({
    where: { project: { tenant: { id: tenantId } } },
  });
  await rawPrisma.project.deleteMany({ where: { tenantId } });
  await rawPrisma.client.deleteMany({ where: { tenantId } });
  await rawPrisma.tenantUser.deleteMany({ where: { tenantId } });
  await rawPrisma.tenant.delete({ where: { id: tenantId } });
}

export { rawPrisma };
```

### 3.3 Phase 3: Refactor Legacy PMO Route Tests

#### 3.3.1 Refactor `projects.routes.test.ts`

**Current broken structure:**

```typescript
const createAuthenticatedAgent = async () => {
  const user = await prisma.user.create({...});
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({...});
  return { agent, user };
};

const createClient = async (ownerId: number) => {
  const tenant = await prisma.tenant.create({...});
  const client = await prisma.client.create({...});
  const account = await prisma.account.create({...});
  return { client, account };
};
```

**Refactored structure:**

```typescript
import {
  createTestEnvironment,
  createTenantAgent,
  cleanupTestEnvironment,
  rawPrisma,
} from './utils/test-fixtures';

describe('projects routes', () => {
  let testEnv: Awaited<ReturnType<typeof createTestEnvironment>>;
  let agent: ReturnType<typeof createTenantAgent>;

  beforeAll(async () => {
    testEnv = await createTestEnvironment('projects');
    agent = createTenantAgent(app, testEnv.token, testEnv.tenant.id);
  });

  afterAll(async () => {
    await cleanupTestEnvironment(testEnv.tenant.id);
  });

  const createClientAndAccount = async () => {
    // Use raw Prisma for setup, explicitly passing tenantId
    const client = await rawPrisma.client.create({
      data: {
        name: 'Test Client',
        tenantId: testEnv.tenant.id, // EXPLICIT TENANT ID
      },
    });

    const account = await rawPrisma.account.create({
      data: {
        name: 'Test Account',
        tenantId: testEnv.tenant.id, // EXPLICIT TENANT ID
        ownerId: testEnv.user.id,
      },
    });

    return { client, account };
  };

  it('creates a project successfully', async () => {
    const { client, account } = await createClientAndAccount();

    const response = await agent.post('/api/projects').send({
      name: 'New Project',
      clientId: client.id,
      accountId: account.id,
      status: 'PLANNING',
    });

    expect(response.status).toBe(201);
    expect(response.body.project).toMatchObject({
      name: 'New Project',
      tenantId: testEnv.tenant.id, // Verify tenant was set
    });
  });
});
```

#### 3.3.2 Refactor Pattern for All Legacy Tests

Apply the same pattern to:

- `task.routes.test.ts`
- `milestone.routes.test.ts`
- `clients.routes.test.ts`
- `meetings.routes.test.ts`
- `meetings.service.test.ts`

**Key changes for each file:**

1. Import shared fixtures
2. Use `createTestEnvironment()` in `beforeAll`
3. Use `createTenantAgent()` for all HTTP requests
4. Explicitly pass `tenantId` when creating test data
5. Clean up in `afterAll`

### 3.4 Phase 4: Update Test Setup

**Modify `test/setup.ts`:**

```typescript
// Add helper to get tenant-scoped Prisma for use in services
import { prisma as extendedPrisma } from '../src/prisma/client';

// Make extended prisma available to tests
export { extendedPrisma };

beforeEach(async () => {
  // Existing cleanup logic...
  // Add: Clear any stale tenant context between tests
  // (This ensures no test pollution)
});
```

### 3.5 Phase 5: Fix Service Tests

**Refactor `meetings.service.test.ts`:**

```typescript
import {
  createTestEnvironment,
  cleanupTestEnvironment,
  rawPrisma,
} from './utils/test-fixtures';
import { withTenant } from './utils/tenant-test-utils';

describe('meeting service', () => {
  let testEnv: Awaited<ReturnType<typeof createTestEnvironment>>;

  beforeAll(async () => {
    testEnv = await createTestEnvironment('meetings-service');
  });

  afterAll(async () => {
    await cleanupTestEnvironment(testEnv.tenant.id);
  });

  const createUserAndProject = async () => {
    // Create client with explicit tenant
    const client = await rawPrisma.client.create({
      data: {
        name: 'Test Client',
        tenantId: testEnv.tenant.id,
      },
    });

    // Create project with explicit tenant
    const project = await rawPrisma.project.create({
      data: {
        name: 'Test Project',
        clientId: client.id,
        ownerId: testEnv.user.id,
        tenantId: testEnv.tenant.id,
        status: 'PLANNING',
      },
    });

    return { user: testEnv.user, project };
  };

  it('supports CRUD operations', async () => {
    const { user, project } = await createUserAndProject();

    // Run service calls within tenant context
    const createResult = await withTenant(testEnv.tenant, () =>
      createMeeting(user.id, {
        projectId: project.id,
        title: 'Kickoff',
        date: new Date(),
        time: '10:00',
        attendees: ['A', 'B'],
      }),
    );

    expect(createResult.meeting).toBeDefined();
  });
});
```

---

## 4. Implementation Checklist

### Phase 1: Infrastructure Updates

- [ ] Update `test/utils/tenant-test-utils.ts` to export both raw and extended Prisma clients
- [ ] Create `test/utils/test-fixtures.ts` with shared test environment helpers
- [ ] Update `test/setup.ts` to handle tenant context cleanup

### Phase 2: Refactor Route Tests

- [ ] Refactor `projects.routes.test.ts`
- [ ] Refactor `task.routes.test.ts`
- [ ] Refactor `milestone.routes.test.ts`
- [ ] Refactor `clients.routes.test.ts`
- [ ] Refactor `meetings.routes.test.ts`

### Phase 3: Refactor Service Tests

- [ ] Refactor `meetings.service.test.ts`

### Phase 4: Verify Existing Tests Still Pass

- [ ] Run `tenant-isolation.test.ts`
- [ ] Run `api-tenant-isolation.test.ts`
- [ ] Run all auth/middleware tests

### Phase 5: Documentation

- [ ] Update test documentation
- [ ] Add comments explaining tenant context requirements

---

## 5. Test File Refactoring Details

### 5.1 `projects.routes.test.ts` (371 lines)

**Changes Required:**

1. Replace `createAuthenticatedAgent()` with shared fixture
2. Replace `createClient()` with tenant-aware version
3. Add `X-Tenant-ID` header to all requests
4. Update assertions to verify tenant isolation

**Estimated effort:** High (most complex test file)

### 5.2 `task.routes.test.ts` (110 lines)

**Changes Required:**

1. Use shared test environment
2. Create Client/Project with explicit tenantId
3. Add tenant headers to requests

**Estimated effort:** Medium

### 5.3 `milestone.routes.test.ts` (97 lines)

**Changes Required:**

1. Use shared test environment
2. Create Client/Project with explicit tenantId
3. Add tenant headers to requests

**Estimated effort:** Medium

### 5.4 `clients.routes.test.ts` (129 lines)

**Changes Required:**

1. Use shared test environment
2. Add tenant headers to requests
3. May need to update Client model handling (legacy)

**Estimated effort:** Medium

### 5.5 `meetings.routes.test.ts` (158 lines)

**Changes Required:**

1. Use shared test environment
2. Create Client/Project with explicit tenantId
3. Add tenant headers to requests

**Estimated effort:** Medium

### 5.6 `meetings.service.test.ts` (186 lines)

**Changes Required:**

1. Use shared test environment
2. Wrap service calls in `withTenant()`
3. Create all entities with explicit tenantId

**Estimated effort:** Medium

---

## 6. Migration Strategy

### Recommended Approach: Incremental Migration

1. **Start with infrastructure** (Phase 1)
   - Create new utility files
   - Don't modify existing tests yet
   - Verify new utilities work

2. **Migrate one test file at a time** (Phases 2-3)
   - Start with smallest file (`milestone.routes.test.ts`)
   - Verify it passes
   - Move to next file

3. **Run full test suite after each migration**
   - Catch regressions early
   - Ensure tenant isolation tests still pass

4. **Consider feature flag approach**
   - Keep old test patterns available initially
   - Gradually deprecate old patterns

---

## 7. Risk Assessment

| Risk                       | Impact | Mitigation                                  |
| -------------------------- | ------ | ------------------------------------------- |
| Breaking working tests     | High   | Run test suite after each change            |
| Missing edge cases         | Medium | Review each test's assertions               |
| Database state pollution   | Medium | Ensure proper cleanup in afterAll/afterEach |
| Parallel test interference | Low    | Each test uses unique tenant suffix         |

---

## 8. Success Criteria

1. All 13 test files pass consistently
2. No cross-tenant data leakage in tests
3. Tenant isolation tests remain green
4. CI pipeline passes
5. No flaky tests due to cleanup issues

---

## 9. Appendix: Model-Tenant Mapping

Models requiring tenant context (from `tenant-extension.ts`):

| Model         | Category   | Route Tests Affected            |
| ------------- | ---------- | ------------------------------- |
| Account       | CRM        | api-tenant-isolation            |
| CRMContact    | CRM        | api-tenant-isolation            |
| Opportunity   | CRM        | api-tenant-isolation            |
| Pipeline      | CRM        | api-tenant-isolation            |
| CRMActivity   | CRM        | api-tenant-isolation            |
| **Client**    | Legacy PMO | clients.routes, projects.routes |
| **Contact**   | Legacy PMO | -                               |
| **Project**   | Legacy PMO | projects.routes                 |
| **Task**      | Legacy PMO | task.routes                     |
| **Milestone** | Legacy PMO | milestone.routes                |
| **Meeting**   | Legacy PMO | meetings.routes                 |

All bolded models are affected by the broken legacy tests.
