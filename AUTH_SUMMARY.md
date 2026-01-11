# Authentication System Investigation - Executive Summary

## The Problem
Users experience "Loading authentication status..." that gets stuck, likely caused by authentication cookies not being sent with cross-origin fetch requests due to a SameSite configuration issue.

## Root Cause (CRITICAL BUG)

**Location**: `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/cookies.ts:12`

```typescript
sameSite: isProd ? 'none' : 'lax',  // Development uses 'lax' ❌
```

**Why This Breaks**:
- Frontend (localhost:3000) and Backend (localhost:4000) are **cross-origin** (different ports)
- Browsers block `sameSite: 'lax'` cookies on cross-origin **fetch()** requests
- After login, the token cookie won't be sent to the backend
- The `/auth/me` request gets a 401 response
- User appears unauthenticated even though a valid cookie exists
- May cause app to hang on "Loading authentication status..." screen

## Complete Authentication Flow

### 1. Initial Page Load
```
Page Load → AuthProvider mounts (status='loading')
         → useEffect calls fetchCurrentUser()
         → GET /api/auth/me
         → Browser checks: Can I send this cookie?
            └─ SameSite='lax' + cross-origin fetch = NO ❌
         → Request sent WITHOUT token
         → Backend returns 401
         → Frontend catches error → status='unauthenticated'
         → Redirect to /login
```

### 2. Login
```
User submits email/password
  → POST /api/auth/login
  → Backend validates credentials (bcrypt)
  → Backend signs JWT token
  → Backend sets HTTP-only cookie (sameSite='lax')
  → Returns user data
  → Frontend sets status='authenticated'
  → Navigate to /dashboard
```

### 3. Page Refresh (THE PROBLEM)
```
Page refresh → Status becomes 'loading' again
            → Calls fetchCurrentUser()
            → Browser won't send cookie (sameSite='lax' restriction)
            → Server returns 401
            → Frontend logs out user 😞
```

## Technical Architecture

### Frontend (React + TypeScript)
- **State Management**: React Context API (AuthContext)
- **API Communication**: Fetch API with `credentials: 'include'`
- **Route Protection**: ProtectedRoute component with loading state
- **Running on**: localhost:3000 (by default)

### Backend (Express + Node.js + TypeScript)
- **Authentication**: JWT tokens in HTTP-only cookies
- **Password Security**: bcrypt with salt rounds (configurable)
- **Middleware**: `requireAuth` middleware validates JWT tokens
- **CORS**: Enabled for cross-origin requests
- **Running on**: localhost:4000 (by default)

### Database
- **ORM**: Prisma
- **Provider**: SQLite (dev) / PostgreSQL (prod)
- **Auth Table**: User model with password hashes

## All Authentication-Related Files

### Frontend (6 files, ~200 LOC)
1. **AuthContext.tsx** (145 lines)
   - Main auth state provider
   - Handles login/logout/initialization
   - Status: 'loading' | 'authenticated' | 'unauthenticated'

2. **ProtectedRoute.tsx** (20 lines)
   - Route guard for protected pages
   - Shows loading message while checking auth

3. **useRedirectOnUnauthorized.ts** (16 lines)
   - Hook to redirect on 401 errors

4. **api/auth.ts** (50 lines)
   - API calls: login(), logout(), fetchCurrentUser()

5. **api/http.ts** (47 lines)
   - HTTP request/response handling
   - Error parsing and type safety

6. **api/config.ts** (38 lines)
   - API URL construction
   - Environment variable handling

### Backend (5 files, ~200 LOC)
1. **auth/auth.routes.ts** (77 lines)
   - POST /api/auth/login
   - POST /api/auth/logout
   - GET /api/auth/me (protected)

2. **auth/auth.middleware.ts** (29 lines)
   - `requireAuth` middleware
   - Validates JWT tokens from cookies

3. **auth/cookies.ts** (18 lines) ⚠️ **CRITICAL BUG HERE**
   - Cookie configuration (sameSite, secure, etc.)
   - Uses 'lax' in development (blocks cross-origin fetch)

4. **auth/jwt.ts** (20 lines)
   - Token signing and verification
   - Configurable expiration

5. **auth/password.ts** (15 lines)
   - Password hashing and comparison
   - Uses bcrypt

### Configuration
- **Frontend**: `/pmo/apps/web/.env` (must set VITE_API_BASE_URL)
- **Backend**: `/pmo/apps/api/.env` (JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_SALT_ROUNDS)

### Tests (3 files, ~310 LOC)
- **auth.routes.test.ts** (162 lines) - Backend API tests
- **auth.middleware.test.ts** (54 lines) - Middleware tests
- **ProtectedRoute.test.tsx** (97 lines) - Frontend route tests

## Key Statistics

| Metric | Value |
|--------|-------|
| Total Auth Files | 13 |
| Lines of Auth Code | ~600 |
| Critical Bugs | 1 (sameSite) |
| Medium Issues | 2 (timeout, env enforcement) |
| API Endpoints | 3 (login, logout, me) |
| Protected Routes | 6+ (dashboard, tasks, clients, projects, assets, meetings) |
| Token Lifetime | 1 hour (configurable) |
| Cookie Lifetime | 7 days |
| Status States | 3 (loading, authenticated, unauthenticated) |
| Error Codes | 400, 401, 403, 404, 500+ |

## API Endpoints Summary

| Endpoint | Method | Auth Required | Purpose |
|----------|--------|---------------|---------|
| /api/auth/login | POST | No | Login with email/password |
| /api/auth/logout | POST | No | Clear authentication cookie |
| /api/auth/me | GET | **Yes** | Get current user data |
| All other endpoints | Various | **Yes** | Protected resources |

## The Fix (Choose One)

### Fix #1: Change sameSite Setting (Simple)
**File**: `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/cookies.ts:12`

Change from:
```typescript
sameSite: isProd ? 'none' : 'lax',
```

To:
```typescript
sameSite: 'none',  // Works for both dev and prod
```

**Requirement**: Must set `VITE_API_BASE_URL` to absolute URL

### Fix #2: Add Vite Proxy (Elegant)
**File**: `/home/user/Consulting-PM-Tool/pmo/apps/web/vite.config.ts`

Add:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:4000',
      changeOrigin: true,
    },
  },
}
```

**Benefit**: Requests to `/api` become same-origin
**No env var needed**: VITE_API_BASE_URL can remain empty in dev

## Recent Changes That Affected Auth

1. **Commit fb5a2a5** (Nov 21) - Added cookies.ts with sameSite configuration
   - **Impact**: Introduced the critical bug

2. **Commit 283e012** (Nov 18) - Aligned auth endpoints with API base
   - **Impact**: Good, but doesn't solve sameSite issue

3. **Commit a31a6ee** (Nov 20) - Documented VITE_API_BASE_URL requirement
   - **Impact**: Good for production, but issue persists in dev

## Environment Variables Required

### Development
```bash
# Frontend (.env at /pmo/apps/web/.env)
VITE_API_BASE_URL="http://localhost:4000/api"

# Backend (.env at /pmo/apps/api/.env)
JWT_SECRET=super-secret-key
JWT_EXPIRES_IN=1h
BCRYPT_SALT_ROUNDS=10
```

### Production
```bash
# Frontend (Vercel environment)
VITE_API_BASE_URL="https://your-api.onrender.com/api"

# Backend (Render environment)
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=1h
BCRYPT_SALT_ROUNDS=10
NODE_ENV=production
```

## Browser Behavior Reference

### SameSite Cookie Sending Rules
| Scenario | SameSite: Lax | SameSite: None |
|----------|---------------|----------------|
| Same-origin request | ✓ Sent | ✓ Sent |
| **Cross-origin fetch** | **✗ Blocked** | ✓ Sent (if secure=true) |
| Cross-origin navigation | ✓ Sent | ✓ Sent |

### Cookie Attributes in This App
| Attribute | Value (Dev) | Value (Prod) | Purpose |
|-----------|------------|-------------|---------|
| httpOnly | true | true | Prevent JS access (security) |
| sameSite | **lax** | none | Same-site policy |
| secure | false | true | HTTPS only (prod) |
| path | / | / | Available to all paths |
| maxAge | 7 days | 7 days | Expiration |

## How to Test

### To verify the bug exists:
1. Start both apps (npm run dev in separate terminals)
2. Log in successfully with `admin@pmo.test` / `AdminDemo123!`
3. **Refresh the page** (⌘R or F5)
4. Open Chrome DevTools → Network tab
5. Look at GET /api/auth/me request
6. Check if "Cookie" header is present
7. If missing → bug confirmed (sameSite='lax' blocking it)

### To verify the fix works:
1. Apply one of the fixes above
2. Log in successfully
3. Refresh the page
4. Should stay logged in
5. Cookies should be sent with subsequent requests

## Next Steps

1. **Immediate**: Apply Fix #1 or Fix #2 to resolve the critical cookie issue
2. **Short-term**: Add fetch timeout handling to prevent hangs
3. **Medium-term**: Improve error handling and user feedback
4. **Long-term**: Add integration tests to catch this type of issue

## Files to Review

Start with these for understanding the issue:
1. `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/cookies.ts` (The bug)
2. `/home/user/Consulting-PM-Tool/pmo/apps/web/src/auth/AuthContext.tsx` (Where it impacts users)
3. `/home/user/Consulting-PM-Tool/pmo/apps/web/src/api/auth.ts` (The failing request)

For detailed analysis, see:
- **AUTH_INVESTIGATION_REPORT.md** (70+ page comprehensive analysis)
- **AUTH_QUICK_REFERENCE.md** (Code snippets and recommendations)

