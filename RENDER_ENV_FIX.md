# Fix for 401 Authentication Errors on Vercel/Render

## Problem

The web app shows 401 errors for all API requests (`/me`, `/projects`, `/clients`) because authentication cookies are not being sent from the browser to the Render backend.

## Root Cause

The backend cookie configuration depends on `NODE_ENV`:
- **Development** (`NODE_ENV=development`): Uses `sameSite: 'lax'` - only works for same-origin
- **Production** (`NODE_ENV=production`): Uses `sameSite: 'none'` - works for cross-origin

If your Render backend is running with `NODE_ENV=development`, it will use `sameSite: 'lax'`, which browsers **reject for cross-origin requests** (Vercel → Render), causing all requests to be unauthenticated.

## Solution: Set NODE_ENV=production on Render

### Step 1: Update Render Environment Variable

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your API service
3. Go to **Environment** tab
4. Add or update the environment variable:
   ```
   NODE_ENV=production
   ```
5. Click **Save Changes**
6. Render will automatically redeploy your service

### Step 2: Verify Vercel Environment Variable

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Ensure `VITE_API_BASE_URL` is set to your Render API URL:
   ```
   VITE_API_BASE_URL=https://your-api-name.onrender.com/api
   ```
   (Replace `your-api-name` with your actual Render service name)
5. If you added/changed this, redeploy from **Deployments** tab

### Step 3: Test Authentication

After both services redeploy:

1. Open your Vercel app in a **new incognito window** (to avoid cached cookies)
2. Open DevTools (F12)
3. Go to **Network** tab
4. Login with: `admin@pmo.test` / `AdminDemo123!`
5. Check the login response headers - you should see:
   ```
   Set-Cookie: token=...; SameSite=None; Secure; HttpOnly
   ```
6. Refresh the page - you should stay logged in
7. No 401 errors should appear in console

## Why This Works

When `NODE_ENV=production`:
- Backend sets cookie with `sameSite: 'none', secure: true`
- This combination is required for cross-origin HTTPS requests
- Browsers accept the cookie and send it with subsequent requests
- Authentication works correctly

## Other Required Render Environment Variables

Make sure these are also set on Render:

```bash
DATABASE_URL=postgresql://...  # Your PostgreSQL connection string
JWT_SECRET=your-secret-key     # Change from default!
JWT_EXPIRES_IN=1h
BCRYPT_SALT_ROUNDS=10
PORT=4000
NODE_ENV=production            # CRITICAL!
```

## Troubleshooting

### Still getting 401 errors after setting NODE_ENV?

1. **Check Render logs**: Verify the service redeployed successfully
2. **Clear browser cache**: Use incognito mode or clear all localhost/Vercel cookies
3. **Check Network tab**:
   - Does login return a `Set-Cookie` header?
   - Does it include `SameSite=None` and `Secure`?
   - Are subsequent requests sending the cookie?
4. **Verify CORS**: Render backend should allow credentials from your Vercel domain

### How to check what NODE_ENV Render is using?

Add this to your API to verify:
```typescript
console.log('NODE_ENV:', process.env.NODE_ENV);
```
Check Render logs to see what value is being used.

## Summary

The fix is simple: **Set `NODE_ENV=production` on Render**. This makes the backend use the correct cookie configuration for cross-origin requests from Vercel.
