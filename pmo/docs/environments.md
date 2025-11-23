# Environments - AI Consulting PMO Platform

**Last Updated**: 2025-11-21

---

## Overview

The AI Consulting PMO Platform uses a three-tier environment strategy:

| Environment     | Purpose                | URL                     | Branch          | Auto-Deploy |
| --------------- | ---------------------- | ----------------------- | --------------- | ----------- |
| **Development** | Local development      | `http://localhost:5173` | N/A             | No          |
| **Staging**     | Pre-production testing | TBD                     | `main`          | Yes         |
| **Production**  | Live user environment  | TBD                     | `main` (tagged) | Manual      |

---

## Development Environment

### Local Setup

**Requirements**:

- Node.js 20+
- PostgreSQL 16 (or SQLite for quick start)

**Quick Start**:

```bash
# 1. Clone repository
git clone <repo-url>
cd Consulting-PM-Tool/pmo

# 2. Install dependencies
npm install

# 3. Set up API environment
cp apps/api/.env.example apps/api/.env

# 4. Run database migrations
npx prisma migrate dev --name init

# 5. Seed test data
npx prisma db seed

# 6. Start services (separate terminals)
npm run dev --workspace pmo-api   # API: http://localhost:4000
npm run dev --workspace pmo-web   # Web: http://localhost:5173
```

### Environment Variables

**API** (`apps/api/.env`):

```env
# Database
DATABASE_URL="file:../../prisma/dev.db"  # SQLite (default)
# or
DATABASE_URL="postgresql://user:password@localhost:5432/pmo_dev"  # PostgreSQL

# Auth
JWT_SECRET="local-dev-secret"
JWT_EXPIRES_IN="1h"
BCRYPT_SALT_ROUNDS=10

# Server
PORT=4000
NODE_ENV="development"

# CORS (optional)
CORS_ORIGIN="http://localhost:5173"
```

**Web** (`apps/web/.env`):

```env
# API Base URL (leave blank to use Vite proxy)
# VITE_API_BASE_URL="http://localhost:4000/api"
```

### Test Accounts

Seeded via `prisma/seed.ts`:

| Email                  | Password        | Role       |
| ---------------------- | --------------- | ---------- |
| `admin@pmo.test`       | `AdminDemo123!` | Admin      |
| `avery.chen@pmo.test`  | `PmoDemo123!`   | Consultant |
| `priya.desai@pmo.test` | `PmoDemo123!`   | Consultant |
| `marco.silva@pmo.test` | `PmoDemo123!`   | Consultant |

---

## Staging Environment

### Purpose

Staging mirrors production configuration and is used for:

- Pre-production testing
- E2E smoke tests
- UAT (User Acceptance Testing)
- Performance benchmarking

### Infrastructure

**Hosting**: TBD (Recommended: Render for API, Vercel for Web)

**Components**:

- **Frontend**: Static build deployed to Vercel/Netlify
- **Backend**: Node.js API on Render/Fly.io/Railway
- **Database**: Managed PostgreSQL (Render Postgres, Railway, or Supabase)

### Configuration

#### Backend (Render)

**Service Type**: Web Service

**Settings**:

- **Build Command**: `cd apps/api && npm install && npm run build`
- **Start Command**: `cd apps/api && npm run start`
- **Node Version**: 20
- **Health Check Path**: `/api/healthz`

**Environment Variables**:

```env
DATABASE_URL=<render-postgres-url>
JWT_SECRET=<random-secret-64-chars>
JWT_EXPIRES_IN=1h
BCRYPT_SALT_ROUNDS=10
NODE_ENV=production
PORT=<auto-assigned-by-render>
CORS_ORIGIN=https://your-staging-web.vercel.app
```

**Post-Deploy Command**:

```bash
npx prisma migrate deploy
```

#### Frontend (Vercel)

**Settings**:

- **Framework Preset**: Vite
- **Root Directory**: `pmo`
- **Build Command**: `npm run build --workspace pmo-web`
- **Output Directory**: `apps/web/dist`

**Environment Variables**:

```env
VITE_API_BASE_URL=https://your-staging-api.onrender.com/api
```

### Deployment Flow

```
1. Push to main branch
   ↓
2. CI runs (lint, test, build, e2e)
   ↓
3. Vercel auto-deploys web (preview)
   ↓
4. Render auto-deploys API
   ↓
5. API runs migrations
   ↓
6. Smoke tests run (optional)
   ↓
7. Staging ready for testing
```

### Access

**URLs**:

- **Web**: `https://pmo-staging.vercel.app` (TBD)
- **API**: `https://pmo-api-staging.onrender.com` (TBD)

**Credentials**: Use production-like test accounts (not seeded data)

---

## Production Environment

### Purpose

Live environment serving real users with production data.

### Infrastructure

**Hosting**: TBD (Recommended: same as staging for consistency)

**Components**:

- **Frontend**: Vercel Pro (for better performance)
- **Backend**: Render Standard or higher
- **Database**: Managed PostgreSQL with automated backups

### Configuration

#### Backend (Render)

**Service Type**: Web Service

**Settings**:

- **Build Command**: `cd apps/api && npm install && npm run build`
- **Start Command**: `cd apps/api && npm run start`
- **Node Version**: 20
- **Health Check Path**: `/api/healthz`
- **Auto-Deploy**: **Disabled** (manual deploys only)

**Environment Variables**:

```env
DATABASE_URL=<render-postgres-url-production>
JWT_SECRET=<strong-random-secret-64-chars>
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=12
NODE_ENV=production
PORT=<auto-assigned-by-render>
CORS_ORIGIN=https://pmo.yourdomain.com
LOG_LEVEL=info
```

**Scaling**:

- Instances: 2+ for high availability
- Auto-scale based on CPU/memory

#### Frontend (Vercel)

**Settings**:

- **Framework Preset**: Vite
- **Root Directory**: `pmo`
- **Build Command**: `npm run build --workspace pmo-web`
- **Output Directory**: `apps/web/dist`
- **Custom Domain**: `pmo.yourdomain.com`

**Environment Variables**:

```env
VITE_API_BASE_URL=https://api.pmo.yourdomain.com/api
```

**Performance**:

- Enable Edge Network
- Configure caching headers
- Enable compression

#### Database (Render Postgres or equivalent)

**Configuration**:

- **Version**: PostgreSQL 16
- **Plan**: Standard or higher
- **Backups**: Daily automated backups (retain 30 days)
- **High Availability**: Enabled (if supported)

### Deployment Flow

```
1. Tag release (e.g., v1.0.0)
   ↓
2. CI runs on tag
   ↓
3. Manual approval required
   ↓
4. Deploy API to production (Render)
   ↓
5. Run database migrations
   ↓
6. Deploy frontend (Vercel)
   ↓
7. Run smoke tests
   ↓
8. Monitor for errors (15 min)
   ↓
9. Rollback if needed
```

### Access

**URLs**:

- **Web**: `https://pmo.yourdomain.com` (TBD)
- **API**: `https://api.pmo.yourdomain.com` (TBD)

**Credentials**: Admin creates user accounts via `/admin/create-user`

---

## Environment Parity

To ensure staging mirrors production:

| Configuration     | Dev              | Staging         | Production      |
| ----------------- | ---------------- | --------------- | --------------- |
| **Node.js**       | 20+              | 20              | 20              |
| **Database**      | SQLite/Postgres  | PostgreSQL 16   | PostgreSQL 16   |
| **JWT Expiry**    | 1h               | 24h             | 24h             |
| **BCRYPT Rounds** | 10               | 12              | 12              |
| **CORS**          | `*` or localhost | Specific origin | Specific origin |
| **Logging**       | debug            | info            | info/warn       |
| **Error Details** | Full stack       | Sanitized       | Sanitized       |

---

## Secrets Management

### Development

Secrets stored in:

- `apps/api/.env` (gitignored)
- `apps/web/.env` (gitignored)

### Staging & Production

Secrets stored in:

- **Render**: Environment tab in service settings
- **Vercel**: Project settings → Environment Variables

**Best Practices**:

- ✅ Use strong random secrets (64+ characters)
- ✅ Rotate secrets quarterly
- ✅ Different secrets per environment
- ❌ Never commit secrets to git
- ❌ Never share secrets via Slack/email

**Generate Secrets**:

```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Migrations

### Development

```bash
# Create migration
npx prisma migrate dev --name <migration-name>

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Staging & Production

```bash
# Deploy migrations (safe, no data loss)
npx prisma migrate deploy
```

**Important**:

- Always test migrations on staging first
- Backup database before running migrations in production
- Migrations should be backwards compatible when possible
- Use transactions for complex migrations

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing in CI (unit, E2E, accessibility)
- [ ] Code reviewed and approved
- [ ] Migrations tested on staging
- [ ] Environment variables configured
- [ ] Secrets rotated (if needed)
- [ ] Database backed up (production only)
- [ ] Release notes prepared

### Deployment

- [ ] Deploy API to Render
- [ ] Run database migrations
- [ ] Verify API health check (`/api/healthz`)
- [ ] Deploy frontend to Vercel
- [ ] Run smoke tests
- [ ] Check error monitoring dashboard

### Post-Deployment

- [ ] Monitor logs for 15 minutes
- [ ] Verify key user flows work
- [ ] Check performance metrics
- [ ] Update documentation if needed
- [ ] Communicate release to team

---

## Rollback Procedure

If issues are detected post-deployment:

### Frontend (Vercel)

```bash
# Via Vercel dashboard
1. Go to Deployments
2. Find previous stable deployment
3. Click "Promote to Production"
```

### Backend (Render)

```bash
# Via Render dashboard
1. Go to service → Deploys
2. Find previous stable deploy
3. Click "Rollback"
```

### Database

```bash
# Restore from backup (Render Postgres)
1. Go to database → Backups
2. Select backup from before migration
3. Restore to a new instance
4. Update DATABASE_URL to point to restored instance
```

---

## Monitoring & Logging

### Health Checks

- **API**: `GET /api/healthz` → `{ "status": "ok", "db": "ok" }`
- **Web**: HTTP 200 on root URL

### Logs

**API Logs** (Render):

- Access via Render dashboard → Logs
- Structured JSON logs (using `pino`)
- Log levels: error, warn, info, debug

**Frontend Logs** (Vercel):

- Runtime logs via Vercel dashboard
- Browser console errors reported to error tracking

### Uptime Monitoring

**Tool**: UptimeRobot, Pingdom, or similar

**Configuration**:

- Monitor API health endpoint every 5 minutes
- Monitor web homepage every 5 minutes
- Alert on 2+ consecutive failures
- Notification channels: Email, Slack

### Error Tracking

**Tool**: Sentry (optional)

```bash
npm install @sentry/node @sentry/react
```

**Configuration**:

- Track unhandled exceptions
- Track API errors (4xx, 5xx)
- Set up alerts for critical errors
- Group errors by route/component

---

## CI/CD Pipeline

**Current**: `.github/workflows/ci.yml`

**Jobs**:

1. **lint-test**: Lint, unit tests, build
2. **e2e**: E2E tests with Playwright

**Future Enhancements**:

- [ ] Add deployment job for staging (auto-deploy on main)
- [ ] Add deployment job for production (manual trigger)
- [ ] Add smoke tests after deployment
- [ ] Add Lighthouse CI for performance regression detection

---

## Domain & SSL

### Staging

**Subdomain**: `staging.pmo.yourdomain.com` or Vercel preview URL

**SSL**: Automatic via Vercel & Render

### Production

**Custom Domain**: `pmo.yourdomain.com`

**DNS Configuration**:

```
A     @      76.76.21.21       (Vercel IP)
CNAME api    pmo-api.onrender.com
```

**SSL**: Automatic via Let's Encrypt (Vercel & Render)

---

## Related Documentation

- [Deployment Notes (Render + Vercel)](./deploy-notes-render-vercel.md)
- [Database Backup & Restore](./db-backup-restore.md)
- [M8 Hardening Notes](./m8-hardening-notes.md)

---

**Document Maintained By**: DevOps / Development Team
**Questions?**: Refer to Render docs (https://render.com/docs) and Vercel docs (https://vercel.com/docs)
