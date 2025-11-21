# Consulting PM Tool - Authentication System Investigation Report

## Executive Summary
The authentication system has been thoroughly analyzed. A **critical cookie configuration issue** has been identified that prevents cookies from being sent with fetch requests in development, which likely causes the "Loading authentication status..." hang.

---

## 1. AUTHENTICATION IMPLEMENTATION OVERVIEW

### Architecture
- **Frontend**: React + React Router + React Context API for auth state
- **Backend**: Express.js with JWT tokens stored in HTTP-only cookies
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (prod)
- **Password Security**: bcrypt with configurable salt rounds
- **Token Security**: JWT signed with configurable secret and expiration

### Authentication Flow

#### Initial Page Load (Protected Routes)
1. User visits app → AuthProvider mounts
2. AuthContext initializes status to 'loading'
3. useEffect triggers initialize() → calls fetchCurrentUser()
4. fetchCurrentUser() makes GET /auth/me with credentials: 'include'
5. If cookie exists and is valid:
   - Backend requireAuth middleware validates JWT token
   - Returns 200 with user data
   - Frontend sets user and status='authenticated'
6. If no/invalid cookie:
   - Backend returns 401 'Unauthorized'
   - Frontend catches error, sets status='unauthenticated'
   - User redirected to /login

#### Login Flow
1. User submits email/password on LoginPage
2. Frontend calls POST /auth/login
3. Backend validates credentials against password hash
4. If valid: Signs JWT, sets HTTP-only cookie, returns 200 + user data
5. Frontend sets user directly + status='authenticated'
6. User navigated to /dashboard

#### Logout Flow
1. User clicks logout button
2. Frontend calls POST /auth/logout
3. Backend clears token cookie
4. Frontend clears user state, status='unauthenticated'
5. User redirected to /login

---

## 2. CRITICAL ISSUE: COOKIE SAMESITE RESTRICTION

### The Problem
**File**: `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/cookies.ts` (lines 11-12)

```typescript
sameSite: isProd ? 'none' : 'lax',
secure: isProd,
```

**Root Cause**: In development, cookies are set with `sameSite: 'lax'`

### Why This Is Critical

**Browser SameSite Cookie Behavior**:
- `sameSite: 'lax'` allows cookies in:
  - Same-site requests ✓
  - Cross-site **top-level navigations** (like clicking a link) ✓
  - Cross-site **fetch/xhr requests** ✗ **BLOCKED**

**Development Architecture**:
- Frontend runs on: `localhost:3000`
- Backend API runs on: `localhost:4000`
- They are **CROSS-ORIGIN** (different ports)

**Expected vs Actual Behavior**:
- Expected: `fetch(..., { credentials: 'include' })` sends the token cookie
- Actual: Browser blocks the cookie due to `sameSite: 'lax'`

### Likely User Impact

**Scenario 1: After Login**
1. User logs in successfully
2. Cookie is set with `sameSite: 'lax'`
3. Frontend is navigated to /dashboard
4. User refreshes the page or clicks a protected route
5. initialize() calls fetchCurrentUser()
6. **Browser does NOT send the token cookie with the fetch request**
7. Backend returns 401 'Unauthorized'
8. Frontend catches error → status='unauthenticated'
9. User is redirected to /login (cookie was "lost")

**Scenario 2: Possible "Loading..." Hang**
If there's a race condition or async handling issue:
1. Page reloads → status='loading'
2. fetchCurrentUser() makes request without cookie
3. Gets 401 response
4. handleResponse throws error
5. initialize() catches it, should set status='unauthenticated'
6. **But if there's an issue with state updates or component unmounting, it could hang**

---

## 3. DETAILED CODE ANALYSIS

### Frontend Authentication (React)

#### AuthContext.tsx
- **Location**: `/home/user/Consulting-PM-Tool/pmo/apps/web/src/auth/AuthContext.tsx`
- **Lines 40-144**: AuthProvider component
- **Key Points**:
  - Line 46: Status initialized to 'loading'
  - Lines 49-83: useEffect runs once on mount
  - Line 54: Calls fetchCurrentUser() to check auth state
  - Lines 66-75: Error handling - catches any error from fetchCurrentUser()
  - Line 74: Sets status='unauthenticated' on error (should handle 401)
  - Lines 85-115: login() function - catches errors with proper typing
  - Line 97-106: Error discrimination by status code
  - **Issue**: No special handling for sameSite cookie issues

#### ProtectedRoute.tsx
- **Location**: `/home/user/Consulting-PM-Tool/pmo/apps/web/src/auth/ProtectedRoute.tsx`
- **Lines 1-19**: Route guard component
- **Line 8-10**: Shows "Loading authentication status..." while isLoading=true
- **Issue**: If initialize() never completes, this message stays forever

#### HTTP/API Layer
- **Location**: `/home/user/Consulting-PM-Tool/pmo/apps/web/src/api/http.ts`
- **Line 17**: Sets `credentials: 'include'` for all requests
- **Lines 23-46**: handleResponse() function
- **Lines 27-28**: JSON parsing with fallback to null
- **Lines 30-42**: Throws ApiError if !response.ok
- **Potential Issue**: If fetch hangs or times out, initialize() never completes

#### API Config
- **Location**: `/home/user/Consulting-PM-Tool/pmo/apps/web/src/api/config.ts`
- **Line 1**: Reads VITE_API_BASE_URL from environment
- **Lines 4-8**: Logs error if missing in production (prevents silent 404s)
- **Lines 23-37**: buildApiUrl() - constructs API endpoints
- **Development**: Falls back to relative `/api/...` URLs
- **Issue**: Relative URLs + cross-origin fetch = cookies won't be sent

#### Auth API Client
- **Location**: `/home/user/Consulting-PM-Tool/pmo/apps/web/src/api/auth.ts`
- **Line 10**: Constructs AUTH_BASE_PATH using buildApiUrl('/auth')
- **Lines 28-38**: fetchCurrentUser()
  - Calls GET /auth/me
  - Uses buildOptions() which sets credentials: 'include'
  - **Critical Issue**: Cookie won't be sent if sameSite=lax + cross-origin

### Backend Authentication (Express)

#### Auth Routes
- **Location**: `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/auth.routes.ts`
- **Lines 13-46**: POST /auth/login
  - Line 21: Finds user by email
  - Line 28: Compares password with bcrypt
  - Line 35: Signs JWT token
  - Line 37: Sets cookie with buildAuthCookieOptions()
  - Line 38-45: Returns user data
  - **Issue**: Cookie is set but won't be sent back with fetch requests

- **Lines 48-51**: POST /auth/logout
  - Clears token cookie using same cookieOptions

- **Lines 53-74**: GET /auth/me (Protected)
  - Line 53: requireAuth middleware validates token
  - Line 59: Finds user by ID from token
  - Lines 66-73: Returns user data

#### Auth Middleware
- **Location**: `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/auth.middleware.ts`
- **Lines 9-28**: requireAuth middleware
- **Line 14**: Extracts token from req.cookies?.token
- **Lines 16-18**: Returns 401 if no token (browser didn't send cookie due to sameSite!)
- **Lines 21-24**: Verifies JWT token validity
- **Line 26**: Returns 401 if token is invalid

#### Cookie Configuration (THE CRITICAL BUG)
- **Location**: `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/cookies.ts`
- **Lines 5-17**: buildAuthCookieOptions()
- **Line 9**: httpOnly=true (prevents JavaScript access, good for security)
- **Line 12**: sameSite='lax' in development (PROBLEMATIC!)
- **Line 13**: secure=false in development (needed for non-HTTPS)
- **Line 14**: maxAge=7 days
- **Line 15**: path='/'

**The Core Issue**:
```typescript
sameSite: isProd ? 'none' : 'lax',  // Line 12
```

In production with `sameSite: 'none'`, the cookie WILL be sent (because secure=true is also required).
In development with `sameSite: 'lax'`, the cookie WON'T be sent with fetch requests (cross-origin).

#### JWT Handling
- **Location**: `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/jwt.ts`
- **Lines 9-15**: signToken() - creates JWT with configurable expiration
- **Lines 17-19**: verifyToken() - validates JWT signature and expiration

#### Password Hashing
- **Location**: `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/password.ts`
- **Lines 5-7**: hashPassword() - bcrypt.hash()
- **Lines 9-14**: comparePassword() - bcrypt.compare()

#### Server Configuration
- **Location**: `/home/user/Consulting-PM-Tool/pmo/apps/api/src/app.ts`
- **Lines 19-24**: CORS configuration
  - Line 21: `origin: true` - allows any origin
  - Line 22: `credentials: true` - allows credentials (cookies)
  - This configuration is correct and allows cross-origin cookie requests

### Environment Configuration

#### Frontend
- **Example**: `/home/user/Consulting-PM-Tool/pmo/apps/web/.env.example`
- **Required**: `VITE_API_BASE_URL` (must be set in production)
- **Default (dev)**: `http://localhost:4000/api`
- **Issue if missing**: Requests fall back to relative `/api/...` URLs

#### Backend
- **Example**: `/home/user/Consulting-PM-Tool/pmo/apps/api/.env.example`
- **Required**: `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`
- **Optional**: `PORT`, `NODE_ENV`

---

## 4. IDENTIFIED ISSUES

### Issue #1: CRITICAL - Cookie SameSite Restriction (Development)
**Severity**: CRITICAL
**Location**: `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/cookies.ts:12`
**Problem**: 
- Development uses `sameSite: 'lax'` which blocks cookies on cross-origin fetch requests
- Frontend (localhost:3000) and Backend (localhost:4000) are cross-origin
- After login, token cookie won't be sent with fetchCurrentUser() GET request
- User appears unauthenticated even though cookie exists

**Evidence**:
- Test file (lines 141-143) expects `SameSite=Lax`
- But tests pass cookies manually, not simulating real browser fetch behavior
- Chrome DevTools would show cookie being sent with navigation but NOT with fetch

**Impact**: 
- Users get logged out when page reloads or navigating between protected routes
- May cause "Loading authentication status..." to transition to "unauthenticated" unexpectedly
- Production should be fine (sameSite: 'none' + secure: true)

### Issue #2: Missing Timeout Handling (Potential Hang)
**Severity**: MEDIUM
**Location**: `/home/user/Consulting-PM-Tool/pmo/apps/web/src/auth/AuthContext.tsx:49-83`
**Problem**:
- fetchCurrentUser() has no timeout
- If API is unresponsive or network hangs, initialize() never completes
- Status remains 'loading' indefinitely
- User sees "Loading authentication status..." forever

**Evidence**:
- No fetch timeout configured
- No race condition handling if component unmounts while pending

**Impact**: If API server is down/slow, users are stuck on loading screen

### Issue #3: Missing Network Error Handling Documentation
**Severity**: LOW
**Location**: `/home/user/Consulting-PM-Tool/pmo/apps/web/src/api/http.ts:23-46`
**Problem**:
- Network errors (failed to fetch) are caught as generic errors
- No distinction between auth failures vs network failures
- User doesn't know if they should retry or if auth is misconfigured

**Impact**: Harder to debug deployment issues

### Issue #4: Frontend Environment Variable Not Enforced in Dev
**Severity**: MEDIUM  
**Location**: `/home/user/Consulting-PM-Tool/pmo/apps/web/src/api/config.ts:4-8`
**Problem**:
- Only warns in production if VITE_API_BASE_URL is missing
- In development, silently falls back to relative `/api/...` URLs
- If developer forgets to set VITE_API_BASE_URL and uses relative URLs, cookies won't work
- Error only visible in console

**Impact**: Developers may not realize their dev setup is misconfigured

---

## 5. TEST COVERAGE ANALYSIS

### Backend Tests Pass But Don't Catch Real Issue
- **Location**: `/home/user/Consulting-PM-Tool/pmo/apps/api/test/auth.routes.test.ts`
- **Line 147**: Manually sets cookie header instead of simulating browser fetch behavior
- **Issue**: Tests pass because supertest manually sends cookies, but real browsers with fetch() won't
- **Test 44-59**: Login test (✓ passes, ✓ checks set-cookie header)
- **Test 81-100**: /auth/me with cookie test (✓ passes, but uses manual cookie setting)
- **Test 125-160**: Tests SameSite=Lax setting (passes, but doesn't test browser behavior)

### Frontend Tests Incomplete
- **Location**: `/home/user/Consulting-PM-Tool/pmo/apps/web/src/auth/ProtectedRoute.test.tsx`
- **Coverage**: Tests three states (loading, unauthenticated, authenticated)
- **Missing**: No integration test for actual fetchCurrentUser() call with mock API
- **Missing**: No test for 401 response handling after successful login

---

## 6. API ENDPOINTS SUMMARY

### Authentication Endpoints
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/auth/login | None | Login with email/password, returns user + sets cookie |
| POST | /api/auth/logout | None | Clear auth cookie |
| GET | /api/auth/me | Required | Get current user data (uses token from cookie) |

### Other Protected Endpoints
All other endpoints (clients, projects, tasks, etc.) require authentication via requireAuth middleware.

---

## 7. COMPLETE FILE LISTING

### Frontend Auth Files
- `/home/user/Consulting-PM-Tool/pmo/apps/web/src/auth/AuthContext.tsx` (145 lines)
- `/home/user/Consulting-PM-Tool/pmo/apps/web/src/auth/ProtectedRoute.tsx` (20 lines)
- `/home/user/Consulting-PM-Tool/pmo/apps/web/src/auth/useRedirectOnUnauthorized.ts` (16 lines)
- `/home/user/Consulting-PM-Tool/pmo/apps/web/src/api/auth.ts` (50 lines)
- `/home/user/Consulting-PM-Tool/pmo/apps/web/src/api/http.ts` (47 lines)
- `/home/user/Consulting-PM-Tool/pmo/apps/web/src/api/config.ts` (38 lines)

### Backend Auth Files
- `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/auth.routes.ts` (77 lines)
- `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/auth.middleware.ts` (29 lines)
- `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/cookies.ts` (18 lines) ← CRITICAL ISSUE
- `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/jwt.ts` (20 lines)
- `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/password.ts` (15 lines)

### Test Files
- `/home/user/Consulting-PM-Tool/pmo/apps/api/test/auth.routes.test.ts` (162 lines)
- `/home/user/Consulting-PM-Tool/pmo/apps/api/test/auth.middleware.test.ts` (54 lines)
- `/home/user/Consulting-PM-Tool/pmo/apps/web/src/auth/ProtectedRoute.test.tsx` (97 lines)

### Configuration Files
- `/home/user/Consulting-PM-Tool/pmo/apps/web/.env.example` (4 lines)
- `/home/user/Consulting-PM-Tool/pmo/apps/api/.env.example` (5 lines)
- `/home/user/Consulting-PM-Tool/pmo/apps/web/vite.config.ts` (14 lines) - No proxy config
- `/home/user/Consulting-PM-Tool/pmo/apps/api/src/config/env.ts` (35 lines)

---

## 8. RECOMMENDED FIXES

### Fix #1: CRITICAL - Cookie SameSite Configuration
**Priority**: CRITICAL (blocks authentication in development)
**Option A (Recommended)**: Use absolute URLs + proper sameSite handling
```typescript
// cookies.ts - Better approach for development
export function buildAuthCookieOptions(): CookieOptions {
  const isProd = env.nodeEnv === 'production';

  return {
    httpOnly: true,
    // Development: Use 'none' with secure:false via HTTPS proxy
    // Production: Use 'none' with secure:true
    sameSite: 'none',
    secure: isProd,  // Only enable in HTTPS environments
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}
```
**Note**: This requires frontend to always use absolute URL (VITE_API_BASE_URL)

**Option B**: Setup development proxy in Vite
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
```
This makes frontend requests to `/api` go to backend, becoming same-origin.

### Fix #2: Add Fetch Timeout
**Priority**: MEDIUM
```typescript
// api/http.ts - Add timeout support
export async function handleResponse<T>(
  response: Response,
  timeout = 5000  // 5 second timeout
): Promise<T> {
  // existing code
}

// Wrap fetch with timeout
const fetchWithTimeout = (url: string, options: RequestInit, timeout = 5000) => {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    ),
  ]);
};
```

### Fix #3: Enforce VITE_API_BASE_URL in Development
**Priority**: LOW
```typescript
// api/config.ts
if (!API_BASE && !import.meta.env.PROD) {
  throw new Error(
    '[API config] VITE_API_BASE_URL must be set in development. ' +
    'Copy .env.example to .env and set VITE_API_BASE_URL=http://localhost:4000/api'
  );
}
```

---

## 9. RECENT CHANGES THAT AFFECTED AUTHENTICATION

### Commit fb5a2a5 (Nov 21) - Fix login cookie and 403 error handling
- Added cookies.ts with sameSite configuration (introduced the bug)
- Improved error discrimination in AuthContext
- **Impact**: Fixed 403 error messages but introduced cookie blocking issue

### Commit 283e012 (Nov 18) - Align auth endpoints with API base
- Updated auth endpoint construction in frontend
- Uses buildApiUrl() for consistency
- **Impact**: Good improvement, but doesn't solve sameSite issue

### Commit a31a6ee (Nov 20) - Document Vercel API base env
- Added documentation for VITE_API_BASE_URL requirement
- Added production warning if env var missing
- **Impact**: Good for production, but issue persists in dev

---

## 10. BROWSER COMPATIBILITY NOTES

### SameSite Cookie Behavior
- **Chrome/Edge**: Enforces sameSite=lax blocking for fetch (2020+)
- **Firefox**: Similar behavior as Chrome
- **Safari**: Similar strict behavior

All modern browsers block cookies with sameSite=lax on cross-origin fetch requests.

---

## CONCLUSION

The authentication system is well-architected with proper security practices (JWT + HTTP-only cookies, password hashing, CORS). However, the **cookie SameSite configuration in development (sameSite: 'lax') is incompatible with cross-origin fetch requests**, which causes the "Loading authentication status..." issue.

**Root Cause of User's Issue**:
The app likely hangs when:
1. Page loads or is refreshed while authenticated
2. Browser doesn't send token cookie due to sameSite=lax restriction
3. /auth/me returns 401
4. If there's a race condition or timing issue, status might not update properly
5. App remains in loading state, showing "Loading authentication status..."

**Most Likely Primary Symptom**: After login, user is logged out on page refresh (cookie not sent), causing cascading auth failures.

