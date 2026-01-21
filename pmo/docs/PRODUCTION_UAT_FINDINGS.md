# Production UAT Findings - Tenant System

**Date:** 2026-01-21
**Tester:** Claude Code
**Environment:** Local (localhost:5173 / localhost:4000) + Production (consulting-pm-web.onrender.com)
**User:** Avery Chen (avery.chen@pmo.test) - Tenant: Verdant Horizon Solutions

---

## Executive Summary

| Category                 | Status                          |
| ------------------------ | ------------------------------- |
| Production Accessibility | BLOCKED - CORS misconfiguration |
| Local Tenant Isolation   | PASS                            |
| API Security             | PASS                            |
| Cross-Tenant Prevention  | PASS                            |
| UI Issues                | 2 issues found                  |

---

## Issues Found

### CRITICAL - Issue #1: Production CORS Misconfiguration

**Environment:** Production (consulting-pm-web.onrender.com)
**Status:** BLOCKER - Cannot test production

**Description:**
The production API at `https://consulting-pm-api.onrender.com` is blocking all requests from the frontend at `https://consulting-pm-web.onrender.com` due to missing CORS configuration.

**Error Message:**

```
Access to fetch at 'https://consulting-pm-api.onrender.com/auth/me' from origin
'https://consulting-pm-web.onrender.com' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Evidence:**

- Screenshot: `.playwright-mcp/production-login-cors-error.png`
- API health check passes: `{"status":"ok","database":"connected"}`
- Frontend loads but all API calls fail

**Root Cause:**
The `CORS_ORIGIN` environment variable is not set in the Render API service configuration.

**Remediation:**

1. Go to Render Dashboard → consulting-pm-api → Environment
2. Add/Update: `CORS_ORIGIN=https://consulting-pm-web.onrender.com`
3. Trigger redeploy

**Priority:** CRITICAL
**Effort:** Low (5 minutes)

---

### MEDIUM - Issue #2: Account Stats Showing Zeros

**Environment:** Local
**Page:** CRM Accounts (`/crm/accounts`)

**Description:**
The account statistics cards show "Prospects: 0", "Customers: 0", "At Risk: 0" when the actual data shows:

- 2 Prospect accounts (GreenEnergy Solutions, TechForward Inc)
- 3 Customer accounts (Velocity Logistics, Brightside Health, Acme Manufacturing)

**Inconsistency:**

- Main Accounts tab stats: Prospects=0, Customers=0, At Risk=0
- Analytics tab stats: At Risk=3, Healthy=2 (correct calculation)

**Evidence:**

- Screenshot: `.playwright-mcp/accounts-stats-issue.png`
- Screenshot: `.playwright-mcp/accounts-analytics-tab.png`

**Root Cause:**
The `/api/crm/accounts/stats` endpoint may not be correctly calculating type-based counts.

**Note:** This fix exists in the `fix/comprehensive-codebase-review` branch (commit a8b823a9) but is not in the current PR branch.

**Priority:** MEDIUM
**Effort:** Low (already fixed in another branch)

---

### LOW - Issue #3: Admin Link Visible to Non-Admin Users

**Environment:** Local
**Page:** Sidebar Navigation

**Description:**
The "Admin" link is visible in the sidebar for non-admin users (e.g., Avery Chen). When clicked, it correctly shows "Forbidden: Admin access required" but the link should be hidden for users without admin role.

**Evidence:**

- Screenshot: `.playwright-mcp/admin-forbidden-non-admin.png`

**Impact:** UX issue only - security is properly enforced by API

**Priority:** LOW
**Effort:** Low

---

## Tests Passed

### Tenant Isolation Tests

| Test                                    | Result | Evidence                             |
| --------------------------------------- | ------ | ------------------------------------ |
| CRM Accounts - data scoped to tenant    | PASS   | All 5 accounts have correct tenantId |
| Leads - data scoped to tenant           | PASS   | 2 leads shown for current tenant     |
| Projects - data scoped to tenant        | PASS   | 1 project shown for current tenant   |
| Account dropdown - only tenant accounts | PASS   | Filter shows only tenant's accounts  |

### API Security Tests

| Test                        | Result | Notes                       |
| --------------------------- | ------ | --------------------------- |
| Tenant-health endpoint auth | PASS   | Returns 401 without auth    |
| Tenant-health data scoping  | PASS   | Returns correct tenant data |
| Plan-limits endpoint        | PASS   | Returns 200 OK              |
| History endpoint            | PASS   | Returns 200 OK              |
| User management auth        | PASS   | Non-admin gets 403          |

### Cross-Tenant Security Tests

| Test                                  | Result | Notes                         |
| ------------------------------------- | ------ | ----------------------------- |
| X-Tenant-ID header spoofing           | PASS   | Fake tenant ID ignored        |
| Data returned is user's actual tenant | PASS   | All data has correct tenantId |

---

## Test Data Summary

### Tenant: Verdant Horizon Solutions

| Entity        | Count |
| ------------- | ----- |
| Accounts      | 5     |
| Leads         | 2     |
| Projects      | 1     |
| Contacts      | 7     |
| Opportunities | 6     |
| Users         | 6     |

### Health Metrics

| Metric       | Value        |
| ------------ | ------------ |
| Health Score | 80           |
| Plan         | PROFESSIONAL |
| Status       | ACTIVE       |
| Churn Risk   | 18% avg      |

---

## Screenshots Captured

| File                              | Description                       |
| --------------------------------- | --------------------------------- |
| `production-login-cors-error.png` | CORS error on production login    |
| `accounts-stats-issue.png`        | Stats showing zeros               |
| `accounts-analytics-tab.png`      | Analytics tab with correct data   |
| `leads-page-tenant-scoped.png`    | Leads list properly scoped        |
| `projects-page-tenant-scoped.png` | Projects list properly scoped     |
| `admin-forbidden-non-admin.png`   | Admin access denied for non-admin |

---

## Recommendations

### Immediate Actions

1. **Fix CORS in Production** (CRITICAL)
   - Add `CORS_ORIGIN=https://consulting-pm-web.onrender.com` to Render environment
   - Redeploy API service

2. **Cherry-pick Account Stats Fix** (MEDIUM)
   - The fix exists in `fix/comprehensive-codebase-review` branch
   - Consider including in the current PR

### Future Improvements

1. **Hide Admin Links** (LOW)
   - Update sidebar to check user role before showing Admin links
   - Implement role-based navigation visibility

2. **Re-run Production UAT**
   - After CORS fix is deployed, re-run full UAT on production
   - Verify all functionality works in production environment

---

## Conclusion

The tenant security system is working correctly at the API level:

- Data isolation is enforced via Prisma extension
- Cross-tenant header spoofing is prevented
- Authentication and authorization are properly enforced
- The fixes in PR #386 (tenant-health middleware, users route, OpportunityContact validation, Prisma model coverage) are functioning as expected

The main blocker for production testing is the CORS misconfiguration, which must be resolved before deploying to users.
