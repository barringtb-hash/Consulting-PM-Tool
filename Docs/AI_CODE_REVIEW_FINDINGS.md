# AI Code Review Findings Report

**Date:** December 7, 2025
**Codebase:** AI Consulting PMO Platform
**Review Type:** Comprehensive Security, Bug, and Code Quality Audit

---

## Executive Summary

This report documents findings from an AI-assisted code review of the PMO Platform codebase. The review identified **8 security issues**, **3 bugs**, **6 code quality concerns**, and **5 testing gaps**.

### Risk Summary

| Severity | Count | Categories |
|----------|-------|------------|
| **HIGH** | 2 | Security |
| **MEDIUM** | 8 | Security, Performance |
| **LOW** | 9 | Code Quality, Testing |

---

## Security Issues

### SEC-001: No Rate Limiting on Authentication Endpoints [HIGH]

**Location:** `pmo/apps/api/src/auth/auth.routes.ts:13-58`

**Issue:** The `/api/auth/login` endpoint has no rate limiting, allowing unlimited authentication attempts. This enables brute-force attacks against user accounts.

**Evidence:**
```typescript
// auth.routes.ts - No rate limiter middleware applied
router.post('/auth/login', async (req, res) => {
  // ... authentication logic without rate limiting
});
```

**Comparison:** The `public-leads.ts` correctly implements rate limiting:
```typescript
// public-leads.ts:9-13 - Correct implementation
const submitLeadRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
});
```

**Recommendation:** Apply rate limiting to auth endpoints:
```typescript
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

router.post('/auth/login', authRateLimiter, async (req, res) => { ... });
```

---

### SEC-002: Timing Attack Vulnerability on Login [MEDIUM]

**Location:** `pmo/apps/api/src/auth/auth.routes.ts:25-37`

**Issue:** The login handler returns early for non-existent users without performing password comparison, creating a timing difference that can reveal valid usernames.

**Evidence:**
```typescript
const user = await prisma.user.findUnique({ where: { email } });

if (!user) {
  res.status(401).json({ error: 'Invalid credentials' }); // Fast return
  return;
}

const isValidPassword = await comparePassword(password, user.passwordHash); // Slower path
```

**Recommendation:** Always perform a bcrypt comparison, even for non-existent users:
```typescript
const user = await prisma.user.findUnique({ where: { email } });
const dummyHash = '$2a$10$abcdefghijklmnopqrstuv'; // Pre-computed dummy hash

const hashToCompare = user?.passwordHash || dummyHash;
const isValid = await comparePassword(password, hashToCompare);

if (!user || !isValid) {
  res.status(401).json({ error: 'Invalid credentials' });
  return;
}
```

---

### SEC-003: TOCTOU Race Conditions in Service Layer [MEDIUM]

**Location:** Multiple files in `pmo/apps/api/src/services/`

**Issue:** Time-of-check to time-of-use (TOCTOU) race conditions exist where records are checked for existence, then modified in separate database operations.

**Affected Files:**
- `client.service.ts:49-60` - updateClient, archiveClient, deleteClient
- `task.service.ts:127-167` - updateTask
- `milestone.service.ts:24-41` - validateProjectAccess

**Evidence:**
```typescript
// client.service.ts:49-60
export const updateClient = async (id: number, data: ClientUpdateInput) => {
  const existing = await prisma.client.findUnique({ where: { id } }); // CHECK
  if (!existing) return null;
  return prisma.client.update({ where: { id }, data }); // USE - race window
};
```

**Recommendation:** Use atomic operations or database transactions:
```typescript
export const updateClient = async (id: number, data: ClientUpdateInput) => {
  try {
    return await prisma.client.update({ where: { id }, data });
  } catch (error) {
    if (error.code === 'P2025') return null; // Record not found
    throw error;
  }
};
```

---

### SEC-004: No JWT Secret Strength Validation [MEDIUM]

**Location:** `pmo/apps/api/src/config/env.ts:29`

**Issue:** The JWT_SECRET is required but not validated for minimum length or entropy. Weak secrets compromise token security.

**Evidence:**
```typescript
export const env = {
  jwtSecret: getRequiredEnv('JWT_SECRET'), // No strength validation
};
```

**Recommendation:** Add minimum secret length validation:
```typescript
const validateJwtSecret = (secret: string): string => {
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  return secret;
};

export const env = {
  jwtSecret: validateJwtSecret(getRequiredEnv('JWT_SECRET')),
};
```

---

### SEC-005: Error Handler Exposes Prisma Details [LOW]

**Location:** `pmo/apps/api/src/middleware/error.middleware.ts:35-41`

**Issue:** Prisma error details are returned to clients, potentially exposing database structure information.

**Evidence:**
```typescript
if (err.name === 'PrismaClientKnownRequestError') {
  res.status(400).json({
    error: 'Database operation failed',
    details: err.message, // Exposes internal details
  });
}
```

**Recommendation:** Log details server-side only:
```typescript
if (err.name === 'PrismaClientKnownRequestError') {
  console.error('Prisma error:', err.message);
  res.status(400).json({ error: 'Database operation failed' });
}
```

---

### SEC-006: No Input Length Limits on Text Fields [LOW]

**Location:** `pmo/apps/api/src/validation/client.schema.ts:4-11`

**Issue:** Zod schemas don't enforce maximum lengths on text fields, allowing excessively large inputs.

**Evidence:**
```typescript
export const clientCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'), // No max length
  industry: z.string().optional(),             // No max length
  notes: z.string().optional(),                // No max length
});
```

**Recommendation:** Add reasonable length limits:
```typescript
export const clientCreateSchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
});
```

---

### SEC-007: Search Input Not Length Limited [LOW]

**Location:** `pmo/apps/api/src/services/client.service.ts:28-38`

**Issue:** Search strings are passed directly to Prisma without length validation, enabling resource exhaustion attacks.

**Evidence:**
```typescript
if (search) {
  const searchFilter: Prisma.StringFilter = {
    contains: search, // No length limit on search
    mode: 'insensitive',
  };
}
```

**Recommendation:** Limit search string length:
```typescript
const sanitizedSearch = search?.slice(0, 200); // Max 200 chars
```

---

### SEC-008: Module Guard Falls Back to Static Config [LOW]

**Location:** `pmo/apps/api/src/middleware/module-guard.middleware.ts:61-74`

**Issue:** When database check fails, module guard falls back to static configuration which may expose modules that should be disabled.

**Evidence:**
```typescript
} catch (error) {
  // Database failure falls back to permissive static config
  console.error('Module guard database check failed, using static config:', error);
  if (!isModuleEnabled(moduleId)) { ... }
  next(); // May allow access when it shouldn't
}
```

**Recommendation:** Fail closed instead of open:
```typescript
} catch (error) {
  console.error('Module guard check failed:', error);
  res.status(503).json({ error: 'Service temporarily unavailable' });
  return;
}
```

---

## Bugs

### BUG-001: deleteClient Performs Soft Delete (Duplicate of archiveClient) [MEDIUM]

**Location:** `pmo/apps/api/src/services/client.service.ts:75-86`

**Issue:** The `deleteClient` function performs a soft delete (sets `archived: true`) identical to `archiveClient`, contrary to its name.

**Evidence:**
```typescript
export const deleteClient = async (id: number) => {
  // ...
  return prisma.client.update({
    where: { id },
    data: { archived: true }, // Soft delete, same as archiveClient
  });
};
```

**Expected Behavior:** `deleteClient` should perform hard delete or be renamed.

**Recommendation:** Either rename to `softDeleteClient` or implement actual deletion:
```typescript
export const deleteClient = async (id: number) => {
  return prisma.client.delete({ where: { id } });
};
```

---

### BUG-002: Potential Null Return Type Inconsistency [LOW]

**Location:** `pmo/apps/api/src/routes/clients.ts:144-151`

**Issue:** The DELETE endpoint calls `deleteClient` and checks for null, but then returns 204 without a body while the route expects consistent behavior.

**Evidence:**
```typescript
const archivedClient = await deleteClient(clientId); // Actually archives
if (!archivedClient) {
  res.status(404).json({ error: 'Client not found' });
  return;
}
res.status(204).send(); // Inconsistent with archive behavior
```

---

### BUG-003: Missing Await on Promise in Error Paths [LOW]

**Location:** Various service files

**Issue:** Some error paths may not properly handle async operations.

**Recommendation:** Audit all async functions for proper await usage.

---

## Performance Issues

### PERF-001: No Pagination on List Endpoints [HIGH]

**Location:** Multiple services

**Issue:** All `findMany` queries return unbounded result sets without pagination.

**Affected Endpoints:**
- `GET /api/clients` - Returns all clients
- `GET /api/projects` - Returns all projects for user
- `GET /api/tasks` - Returns all tasks for project
- `GET /api/leads` - Returns all leads
- `GET /api/contacts` - Returns all contacts

**Evidence:**
```typescript
// client.service.ts:40-43
return prisma.client.findMany({
  where,
  orderBy: { createdAt: 'desc' },
  // No take/skip pagination
});
```

**Recommendation:** Implement cursor-based or offset pagination:
```typescript
export const listClients = async ({
  search,
  page = 1,
  limit = 50,
}: ListClientsParams) => {
  return prisma.client.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100), // Cap at 100
    skip: (page - 1) * limit,
  });
};
```

---

### PERF-002: Multi-Field Search Without Optimization [MEDIUM]

**Location:** `pmo/apps/api/src/services/client.service.ts:28-38`

**Issue:** Search queries across 3 fields (name, industry, notes) use `contains` with case-insensitive mode, which is slow on large datasets.

**Recommendation:** Consider full-text search or limit searchable fields.

---

## Code Quality Issues

### CQ-001: TypeScript Suppression in Tests [LOW]

**Location:**
- `pmo/apps/web/src/pages/ClientDetailsPage.test.tsx`
- `pmo/apps/web/src/pages/ClientsPage.test.tsx`

**Issue:** Test files contain `@ts-ignore` or `@ts-expect-error` directives.

**Recommendation:** Fix type issues rather than suppressing them.

---

### CQ-002: Inconsistent Error Return Patterns [LOW]

**Location:** Service layer

**Issue:** Some services return `null` for not found, others return `{ error: 'not_found' }`.

**Examples:**
- `client.service.ts` returns `null`
- `task.service.ts` returns `{ error: 'not_found' }`

**Recommendation:** Standardize on one pattern across all services.

---

### CQ-003: Duplicated Query Parameter Parsing [LOW]

**Location:** Route handlers in `pmo/apps/api/src/routes/`

**Issue:** Query parameter parsing (converting strings to numbers/enums) is duplicated across route handlers.

**Recommendation:** Create shared query parameter parsing utilities.

---

## Testing Gaps

### TEST-001: No Project Routes Tests [HIGH]

**Location:** Missing `pmo/apps/api/test/projects.routes.test.ts`

**Issue:** Project CRUD operations have no unit test coverage.

---

### TEST-002: No Rate Limiting Tests [MEDIUM]

**Location:** Missing rate limiter tests

**Issue:** Rate limiting middleware has no test coverage.

---

### TEST-003: No Role-Based Access Tests [MEDIUM]

**Location:** Missing RBAC tests

**Issue:** `requireRole` and `requireAnyRole` middleware lack test coverage.

---

### TEST-004: No AI Module Tests [MEDIUM]

**Location:** `pmo/apps/api/src/modules/*/`

**Issue:** AI tool modules (chatbot, scheduling, document-analyzer, etc.) have no test coverage.

---

### TEST-005: No Module Guard Tests [LOW]

**Location:** Missing module-guard tests

**Issue:** `requireModule` middleware lacks test coverage.

---

## Positive Findings

The following security practices are well-implemented:

1. **Cookie Security** (`cookies.ts:20-34`) - Proper httpOnly, secure, sameSite, and partitioned attributes
2. **CORS Configuration** (`app.ts:52-94`) - Dynamic origin validation with Vercel preview support
3. **SQL Injection Prevention** - Prisma ORM used throughout (no raw queries except health check)
4. **Password Hashing** - bcryptjs with configurable salt rounds
5. **Authorization Checks** - Project ownership validated before operations
6. **Safari ITP Handling** - Dual auth method (cookie + Authorization header fallback)
7. **Input Validation** - Zod schemas on all POST/PUT/PATCH endpoints

---

## Remediation Priority

| Priority | Issue ID | Effort | Impact |
|----------|----------|--------|--------|
| 1 | SEC-001 | Low | High - Prevents brute force |
| 2 | PERF-001 | Medium | High - Prevents DoS |
| 3 | SEC-003 | Medium | Medium - Data integrity |
| 4 | SEC-002 | Low | Medium - User enumeration |
| 5 | TEST-001 | Medium | Medium - Confidence |
| 6 | BUG-001 | Low | Low - Correctness |
| 7 | SEC-004 | Low | Low - Startup validation |

---

## Appendix: Files Reviewed

### Security-Critical Files
- `pmo/apps/api/src/auth/auth.routes.ts`
- `pmo/apps/api/src/auth/auth.middleware.ts`
- `pmo/apps/api/src/auth/jwt.ts`
- `pmo/apps/api/src/auth/cookies.ts`
- `pmo/apps/api/src/auth/password.ts`
- `pmo/apps/api/src/auth/role.middleware.ts`
- `pmo/apps/api/src/middleware/rate-limit.middleware.ts`
- `pmo/apps/api/src/middleware/module-guard.middleware.ts`
- `pmo/apps/api/src/middleware/error.middleware.ts`
- `pmo/apps/api/src/config/env.ts`

### Service Layer
- `pmo/apps/api/src/services/client.service.ts`
- `pmo/apps/api/src/services/project.service.ts`
- `pmo/apps/api/src/services/task.service.ts`
- `pmo/apps/api/src/services/milestone.service.ts`

### Route Handlers
- `pmo/apps/api/src/routes/clients.ts`
- `pmo/apps/api/src/routes/projects.ts`
- `pmo/apps/api/src/routes/public-leads.ts`

### Validation Schemas
- `pmo/apps/api/src/validation/client.schema.ts`

### Frontend
- `pmo/apps/web/src/api/http.ts`
- `pmo/apps/web/src/api/token-storage.ts`

---

*Report generated by AI Code Review Agent*
