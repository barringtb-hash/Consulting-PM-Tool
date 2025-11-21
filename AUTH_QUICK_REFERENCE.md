# Authentication System - Quick Reference Guide

## Critical Bug: Cookie SameSite Restriction

### The Bug (MUST FIX)
**File**: `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/cookies.ts:12`

**Current Code**:
```typescript
sameSite: isProd ? 'none' : 'lax',  // ❌ 'lax' breaks development
```

**Why It's Broken**:
- Frontend: localhost:3000
- Backend: localhost:4000
- These are **cross-origin**
- `sameSite: 'lax'` blocks cookies on **fetch()** requests
- After login, `/auth/me` request is made WITHOUT the token cookie
- Server returns 401 → user appears unauthenticated
- **Result**: Users get logged out on page refresh

### Browser Cookie Behavior Reference
| Scenario | SameSite: Lax | SameSite: None |
|----------|---------------|----------------|
| Same-origin fetch | ✓ Sent | ✓ Sent |
| Cross-origin fetch | ✗ NOT sent | ✓ Sent (if secure=true) |
| Top-level navigation | ✓ Sent | ✓ Sent |

---

## Authentication Flow Diagram

```
LOGIN:
┌─ User enters credentials
├─ POST /api/auth/login
├─ Backend validates password
├─ Backend signs JWT
├─ Backend sets cookie: sameSite='lax' ⚠️
└─ Frontend sets status='authenticated'

PAGE RELOAD:
┌─ AuthProvider mounts
├─ status='loading'
├─ GET /api/auth/me with credentials:'include'
├─ Browser checks cookie...
│  └─ sameSite='lax' + cross-origin = COOKIE BLOCKED ❌
├─ Request sent WITHOUT token cookie
├─ Backend returns 401 (no token found)
├─ Frontend sets status='unauthenticated' ❌
└─ User redirected to /login (logged out!)
```

---

## Key Code Sections

### 1. Frontend Auth State (AuthContext.tsx)
**Location**: `/home/user/Consulting-PM-Tool/pmo/apps/web/src/auth/AuthContext.tsx:49-83`

```typescript
useEffect(() => {
  let isMounted = true;
  
  const initialize = async () => {
    try {
      // This call won't include the token cookie due to sameSite='lax'
      const currentUser = await fetchCurrentUser();
      
      if (!isMounted) return;
      
      if (currentUser) {
        setUser(currentUser);
        setStatus('authenticated');
      } else {
        setStatus('unauthenticated');  // ← User gets logged out here
      }
    } catch (err) {
      console.error('Failed to fetch current user', err);
      if (!isMounted) return;
      
      setUser(null);
      setStatus('unauthenticated');
    }
  };
  
  void initialize();
  
  return () => { isMounted = false; };
}, []);
```

### 2. Protected Route Component (ProtectedRoute.tsx)
**Location**: `/home/user/Consulting-PM-Tool/pmo/apps/web/src/auth/ProtectedRoute.tsx:8-10`

```typescript
if (isLoading) {
  return <p>Loading authentication status...</p>;  // ← Stuck here if issue!
}
```

### 3. API Request with Credentials (http.ts)
**Location**: `/home/user/Consulting-PM-Tool/pmo/apps/web/src/api/http.ts:17`

```typescript
credentials: 'include',  // ← Requests to include cookies
```

### 4. Current User Fetch (auth.ts)
**Location**: `/home/user/Consulting-PM-Tool/pmo/apps/web/src/api/auth.ts:28-38`

```typescript
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch(
    `${AUTH_BASE_PATH}/me`,  // GET /api/auth/me
    buildOptions({
      method: 'GET',
      // credentials: 'include' is added by buildOptions
      // BUT browser won't send cookie due to sameSite='lax'
    }),
  );
  
  const data = await handleResponse<{ user: AuthUser | null }>(response);
  return data.user ?? null;
}
```

### 5. The Problematic Cookie Setup (cookies.ts)
**Location**: `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/cookies.ts:5-17`

```typescript
export function buildAuthCookieOptions(): CookieOptions {
  const isProd = env.nodeEnv === 'production';
  
  return {
    httpOnly: true,      // ✓ Good: Prevents JavaScript access
    // ❌ PROBLEM: 'lax' doesn't work with cross-origin fetch!
    sameSite: isProd ? 'none' : 'lax',
    // ✓ Good: Only HTTPS in production
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    path: '/',
  };
}
```

### 6. Backend Auth Middleware (auth.middleware.ts)
**Location**: `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/auth.middleware.ts:14-18`

```typescript
const token = req.cookies?.token;  // ← Cookie is empty because browser didn't send it!

if (!token) {
  res.status(401).json({ error: 'Unauthorized' });  // ← Returns 401
  return;
}
```

---

## Recommended Fixes (Pick One)

### OPTION 1: Change sameSite Strategy (Simplest)
**File to modify**: `/home/user/Consulting-PM-Tool/pmo/apps/api/src/auth/cookies.ts`

```typescript
export function buildAuthCookieOptions(): CookieOptions {
  const isProd = env.nodeEnv === 'production';
  
  return {
    httpOnly: true,
    sameSite: 'none',  // ✓ Works for cross-origin fetch
    secure: isProd,     // ✓ Required when sameSite=none
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}
```

**Requirements**:
- Must set `VITE_API_BASE_URL` to absolute URL in development
- Frontend must use absolute URLs, not relative `/api/...`

### OPTION 2: Add Vite Proxy (Most Elegant)
**File to modify**: `/home/user/Consulting-PM-Tool/pmo/apps/web/vite.config.ts`

```typescript
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  root: resolve(__dirname),
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
});
```

**Benefit**: Requests to `/api` become same-origin (localhost:3000/api)
**Result**: sameSite='lax' works correctly again

---

## Testing the Issue

### How to Verify the Bug
1. Start both apps (npm run dev in both terminals)
2. Log in successfully (user data shows in frontend)
3. **Refresh the page** (⌘R or F5)
4. Watch browser DevTools → Network tab:
   - GET /api/auth/me request
   - Cookie NOT sent in headers (if sameSite='lax' + cross-origin)
   - Returns 401 Unauthorized
5. Page reloads with "Loading..." or redirects to /login

### Browser DevTools Check
Chrome/Edge DevTools → Application → Cookies:
- Look for "token" cookie
- Check SameSite value: 
  - "Lax" = ❌ Won't send with fetch
  - "None" = ✓ Sends with fetch (if Secure is also set)

---

## Authentication Files Map

```
Frontend Auth System:
├── /pmo/apps/web/src/auth/
│   ├── AuthContext.tsx (145 lines) - Main auth state management
│   ├── ProtectedRoute.tsx (20 lines) - Route guard component
│   └── useRedirectOnUnauthorized.ts (16 lines) - 401 redirect hook
├── /pmo/apps/web/src/api/
│   ├── auth.ts (50 lines) - API calls for auth
│   ├── http.ts (47 lines) - Request/response handling
│   └── config.ts (38 lines) - API URL construction
└── /pmo/apps/web/.env.example

Backend Auth System:
├── /pmo/apps/api/src/auth/
│   ├── auth.routes.ts (77 lines) - Login/logout/me endpoints
│   ├── auth.middleware.ts (29 lines) - JWT validation
│   ├── cookies.ts (18 lines) ⚠️ CRITICAL BUG HERE
│   ├── jwt.ts (20 lines) - Token signing/verifying
│   └── password.ts (15 lines) - Password hashing
├── /pmo/apps/api/src/app.ts - Server setup with CORS
└── /pmo/apps/api/.env.example

Tests:
├── /pmo/apps/api/test/auth.routes.test.ts (162 lines)
├── /pmo/apps/api/test/auth.middleware.test.ts (54 lines)
└── /pmo/apps/web/src/auth/ProtectedRoute.test.tsx (97 lines)
```

---

## Environment Configuration

### Development Setup
```bash
# Frontend (.env at /pmo/apps/web/.env)
VITE_API_BASE_URL="http://localhost:4000/api"

# Backend (.env at /pmo/apps/api/.env)
PORT=4000
JWT_SECRET=super-secret-key
JWT_EXPIRES_IN=1h
BCRYPT_SALT_ROUNDS=10
```

### Production Setup
```bash
# Frontend (Set in Vercel environment)
VITE_API_BASE_URL="https://your-api.onrender.com/api"

# Backend (Set in Render environment)
JWT_SECRET=<strong-secret>
JWT_EXPIRES_IN=1h
BCRYPT_SALT_ROUNDS=10
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Loading..." hangs | Fetch timeout or no API response | Add timeout, check if backend is running |
| User logged out after refresh | sameSite='lax' blocks cookie | Use OPTION 1 or OPTION 2 fix |
| 401 errors on protected routes | Token cookie not sent to backend | Ensure cookie config is correct |
| CORS errors | Frontend/backend origin mismatch | Use absolute URL or proxy |
| Production auth fails | VITE_API_BASE_URL not set | Set in Vercel environment variables |

---

## Key Statistics

- **Total Auth-related Files**: 13
- **Total Lines of Auth Code**: ~600 lines
- **Critical Bugs Found**: 1 (sameSite cookie)
- **Medium Issues**: 2 (timeout handling, env enforcement)
- **Backend Status Codes Used**: 200, 400, 401, 403, 404, 500+
- **Token Lifetime**: 1 hour (configurable)
- **Cookie Lifetime**: 7 days
- **Database**: Prisma ORM with User model

