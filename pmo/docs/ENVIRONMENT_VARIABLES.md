# Environment Variables Reference

This document provides a comprehensive reference for all environment variables used in the PMO platform. Variables are organized by service and feature area.

**Last Updated**: 2026-01-15

---

## Table of Contents

- [Quick Start](#quick-start)
- [Backend API Variables](#backend-api-variables)
  - [Core Configuration](#core-configuration)
  - [Database](#database)
  - [Authentication and Security](#authentication-and-security)
  - [CORS and Networking](#cors-and-networking)
  - [Multi-Tenancy](#multi-tenancy)
  - [Caching (Redis)](#caching-redis)
  - [WebSocket](#websocket)
  - [Logging](#logging)
- [Frontend Web Variables](#frontend-web-variables)
- [AI and ML Services](#ai-and-ml-services)
  - [OpenAI](#openai)
  - [Anthropic](#anthropic)
- [Third-Party Integrations](#third-party-integrations)
  - [Social Publishing (Ayrshare)](#social-publishing-ayrshare)
  - [Payment Processing (Stripe)](#payment-processing-stripe)
  - [SMS Notifications (Twilio)](#sms-notifications-twilio)
  - [Email Notifications (SendGrid)](#email-notifications-sendgrid)
  - [Google OAuth and Calendar](#google-oauth-and-calendar)
  - [Microsoft OAuth and Calendar](#microsoft-oauth-and-calendar)
  - [CRM Integrations](#crm-integrations)
  - [Communication Integrations](#communication-integrations)
- [Module Configuration](#module-configuration)
- [Environment-Specific Settings](#environment-specific-settings)
- [Security Best Practices](#security-best-practices)

---

## Quick Start

For local development, copy the example files and configure minimum required variables:

```bash
# API configuration
cp pmo/apps/api/.env.example pmo/apps/api/.env

# Web configuration (optional for local dev)
cp pmo/apps/web/.env.example pmo/apps/web/.env
```

**Minimum required variables for local development:**

```env
# pmo/apps/api/.env
DATABASE_URL="file:../../prisma/dev.db"
JWT_SECRET="your-development-secret-at-least-32-characters"
JWT_EXPIRES_IN="1h"
BCRYPT_SALT_ROUNDS=10
PORT=4000
```

---

## Backend API Variables

Located in `pmo/apps/api/.env`

### Core Configuration

| Variable   | Required | Default       | Description                                                          |
| ---------- | -------- | ------------- | -------------------------------------------------------------------- |
| `NODE_ENV` | No       | `development` | Application environment. Values: `development`, `production`, `test` |
| `PORT`     | No       | `4000`        | HTTP server port. Must be 1-65535.                                   |

**Example:**

```env
NODE_ENV=development
PORT=4000
```

### Database

| Variable       | Required | Default | Description                                                 |
| -------------- | -------- | ------- | ----------------------------------------------------------- |
| `DATABASE_URL` | **Yes**  | -       | Database connection string. Supports PostgreSQL and SQLite. |

**SQLite (Local Development):**

```env
DATABASE_URL="file:../../prisma/dev.db"
```

**PostgreSQL (Staging/Production):**

```env
DATABASE_URL="postgresql://user:password@localhost:5432/pmo_db"
```

**PostgreSQL with SSL (Production):**

```env
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"
```

### Authentication and Security

| Variable             | Required | Default | Description                                                                           |
| -------------------- | -------- | ------- | ------------------------------------------------------------------------------------- |
| `JWT_SECRET`         | **Yes**  | -       | Secret key for signing JWT tokens. Must be at least 32 characters.                    |
| `JWT_EXPIRES_IN`     | **Yes**  | -       | JWT token expiration time. Examples: `1h`, `7d`, `30m`                                |
| `BCRYPT_SALT_ROUNDS` | **Yes**  | -       | Number of bcrypt hashing rounds. Recommended: 10-14. Higher = more secure but slower. |

**Generate a secure JWT secret:**

```bash
openssl rand -base64 48
```

**Example:**

```env
JWT_SECRET="a-very-long-random-secret-that-is-at-least-32-characters"
JWT_EXPIRES_IN="24h"
BCRYPT_SALT_ROUNDS=12
```

**Security Notes:**

- `JWT_SECRET` should be unique per environment
- Production should use 12+ bcrypt rounds
- Development can use 10 rounds for faster testing

### CORS and Networking

| Variable      | Required | Default | Description                                                                               |
| ------------- | -------- | ------- | ----------------------------------------------------------------------------------------- |
| `CORS_ORIGIN` | No       | -       | Allowed CORS origins for cross-origin requests. Leave empty for development (allows all). |

**Single Origin:**

```env
CORS_ORIGIN="https://your-app.vercel.app"
```

**Multiple Origins:**

```env
CORS_ORIGIN="https://your-app.vercel.app,https://staging.your-app.vercel.app"
```

**Vercel Preview Deployments:**
When any `*.vercel.app` URL is included, all Vercel preview URLs are automatically allowed.

### Multi-Tenancy

| Variable               | Required | Default     | Description                                                             |
| ---------------------- | -------- | ----------- | ----------------------------------------------------------------------- |
| `MULTI_TENANT_ENABLED` | No       | `true`      | Enable multi-tenant mode. Set to `false` for single-tenant deployments. |
| `DEFAULT_TENANT_SLUG`  | No       | `default`   | Default tenant identifier for single-tenant mode.                       |
| `TENANT_DOMAINS`       | No       | `localhost` | Comma-separated list of allowed tenant domains.                         |

**Example:**

```env
MULTI_TENANT_ENABLED=true
DEFAULT_TENANT_SLUG=acme-corp
TENANT_DOMAINS=localhost,acme.example.com
```

### Caching (Redis)

| Variable    | Required | Default | Description                                                    |
| ----------- | -------- | ------- | -------------------------------------------------------------- |
| `REDIS_URL` | No       | -       | Redis connection URL. If not set, Redis features are disabled. |

**Example:**

```env
REDIS_URL="redis://localhost:6379"
```

**With Authentication:**

```env
REDIS_URL="redis://:password@redis-host:6379"
```

**Redis Features (when enabled):**

- API response caching
- Rate limiting
- Session storage
- BullMQ job queues for background tasks
- Pub/Sub for real-time updates

### WebSocket

| Variable     | Required | Default | Description                                      |
| ------------ | -------- | ------- | ------------------------------------------------ |
| `WS_ENABLED` | No       | `false` | Enable WebSocket support for real-time features. |

**Example:**

```env
WS_ENABLED=true
```

### Logging

| Variable    | Required | Default                       | Description                                                 |
| ----------- | -------- | ----------------------------- | ----------------------------------------------------------- |
| `LOG_LEVEL` | No       | `debug` (dev) / `info` (prod) | Minimum log level. Values: `debug`, `info`, `warn`, `error` |

**Example:**

```env
LOG_LEVEL=info
```

---

## Frontend Web Variables

Located in `pmo/apps/web/.env`

All frontend variables must be prefixed with `VITE_` to be exposed to the browser.

| Variable               | Required | Default | Description                                                        |
| ---------------------- | -------- | ------- | ------------------------------------------------------------------ |
| `VITE_API_BASE_URL`    | No       | -       | API base URL. Leave empty for local development (uses Vite proxy). |
| `VITE_ENABLED_MODULES` | No       | -       | Comma-separated list of enabled modules. Empty enables all.        |

**Local Development (using Vite proxy):**

```env
# Leave commented out or empty
# VITE_API_BASE_URL=
```

**Production (Vercel + Render):**

```env
VITE_API_BASE_URL="https://your-api.onrender.com/api"
```

---

## AI and ML Services

### OpenAI

Required for AI-powered features including chatbots, content generation, lead scoring, and project insights.

| Variable         | Required | Default | Description                                              |
| ---------------- | -------- | ------- | -------------------------------------------------------- |
| `OPENAI_API_KEY` | No\*     | -       | OpenAI API key for GPT models. Required for AI features. |

\*Required if using any AI/ML features.

**Example:**

```env
OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Features requiring OpenAI:**

- AI Chatbot (Tool 1.1)
- Content Generation (Tool 2.2)
- Lead Scoring ML predictions
- Project ML insights
- RAID extraction from meeting notes
- Smart scheduling suggestions
- Document analysis

### Anthropic

Legacy support for Anthropic Claude models.

| Variable            | Required | Default | Description                 |
| ------------------- | -------- | ------- | --------------------------- |
| `ANTHROPIC_API_KEY` | No       | -       | Anthropic API key (legacy). |

**Example:**

```env
ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

---

## Third-Party Integrations

### Social Publishing (Ayrshare)

Unified social media publishing to LinkedIn, Twitter/X, Instagram, Facebook, TikTok, YouTube, Pinterest, Threads, and Bluesky.

| Variable           | Required | Default | Description                                   |
| ------------------ | -------- | ------- | --------------------------------------------- |
| `AYRSHARE_API_KEY` | No       | -       | Ayrshare API key for social media publishing. |

**Example:**

```env
AYRSHARE_API_KEY="your-ayrshare-api-key"
```

### Payment Processing (Stripe)

For appointment booking payments.

| Variable                | Required | Default | Description                    |
| ----------------------- | -------- | ------- | ------------------------------ |
| `STRIPE_SECRET_KEY`     | No       | -       | Stripe secret API key.         |
| `STRIPE_WEBHOOK_SECRET` | No       | -       | Stripe webhook signing secret. |

**Example:**

```env
STRIPE_SECRET_KEY="sk_test_your_test_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
```

**Production Keys:**

```env
STRIPE_SECRET_KEY="sk_live_your_production_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_production_webhook_secret_here"
```

### SMS Notifications (Twilio)

For appointment reminders and SMS-based chatbot.

| Variable              | Required | Default | Description                          |
| --------------------- | -------- | ------- | ------------------------------------ |
| `TWILIO_ACCOUNT_SID`  | No       | -       | Twilio account SID.                  |
| `TWILIO_AUTH_TOKEN`   | No       | -       | Twilio auth token.                   |
| `TWILIO_PHONE_NUMBER` | No       | -       | Twilio phone number for sending SMS. |

**Example:**

```env
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+15551234567"
```

### Email Notifications (SendGrid)

For appointment confirmations and email notifications.

| Variable              | Required | Default               | Description           |
| --------------------- | -------- | --------------------- | --------------------- |
| `SENDGRID_API_KEY`    | No       | -                     | SendGrid API key.     |
| `SENDGRID_FROM_EMAIL` | No       | `noreply@example.com` | Sender email address. |
| `SENDGRID_FROM_NAME`  | No       | `Appointment Booking` | Sender display name.  |

**Example:**

```env
SENDGRID_API_KEY="SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
SENDGRID_FROM_EMAIL="appointments@yourcompany.com"
SENDGRID_FROM_NAME="Your Company Appointments"
```

### Google OAuth and Calendar

For Google Calendar integration and Gmail sync.

| Variable               | Required | Default | Description                 |
| ---------------------- | -------- | ------- | --------------------------- |
| `GOOGLE_CLIENT_ID`     | No       | -       | Google OAuth client ID.     |
| `GOOGLE_CLIENT_SECRET` | No       | -       | Google OAuth client secret. |
| `GOOGLE_REDIRECT_URI`  | No       | -       | OAuth callback URL.         |

**Example:**

```env
GOOGLE_CLIENT_ID="xxxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxx"
GOOGLE_REDIRECT_URI="https://your-api.com/api/integrations/google/callback"
```

### Microsoft OAuth and Calendar

For Outlook Calendar integration and Microsoft 365 sync.

| Variable                  | Required | Default  | Description                                          |
| ------------------------- | -------- | -------- | ---------------------------------------------------- |
| `MICROSOFT_CLIENT_ID`     | No       | -        | Microsoft Azure AD application ID.                   |
| `MICROSOFT_CLIENT_SECRET` | No       | -        | Microsoft Azure AD client secret.                    |
| `MICROSOFT_REDIRECT_URI`  | No       | -        | OAuth callback URL.                                  |
| `MICROSOFT_TENANT`        | No       | `common` | Azure AD tenant. Use `common` for multi-tenant apps. |

**Example:**

```env
MICROSOFT_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
MICROSOFT_CLIENT_SECRET="your-client-secret"
MICROSOFT_REDIRECT_URI="https://your-api.com/api/integrations/microsoft/callback"
MICROSOFT_TENANT=common
```

### CRM Integrations

For connecting with external CRM systems.

**Salesforce:**
| Variable | Description |
|----------|-------------|
| `SALESFORCE_CLIENT_ID` | Salesforce connected app client ID |
| `SALESFORCE_CLIENT_SECRET` | Salesforce connected app client secret |

**HubSpot:**
| Variable | Description |
|----------|-------------|
| `HUBSPOT_CLIENT_ID` | HubSpot app client ID |
| `HUBSPOT_CLIENT_SECRET` | HubSpot app client secret |

**Pipedrive:**
| Variable | Description |
|----------|-------------|
| `PIPEDRIVE_CLIENT_ID` | Pipedrive app client ID |
| `PIPEDRIVE_CLIENT_SECRET` | Pipedrive app client secret |

### Communication Integrations

**Slack:**
| Variable | Description |
|----------|-------------|
| `SLACK_CLIENT_ID` | Slack app client ID |
| `SLACK_CLIENT_SECRET` | Slack app client secret |

---

## Module Configuration

The platform supports toggleable modules that can be enabled/disabled per deployment or per tenant.

### Backend Module Configuration

| Variable          | Required | Default     | Description                                 |
| ----------------- | -------- | ----------- | ------------------------------------------- |
| `ENABLED_MODULES` | No       | All enabled | Comma-separated list of enabled module IDs. |

### Frontend Module Configuration

| Variable               | Required | Default     | Description                                 |
| ---------------------- | -------- | ----------- | ------------------------------------------- |
| `VITE_ENABLED_MODULES` | No       | All enabled | Comma-separated list of enabled module IDs. |

### Available Modules

**Core Modules (always enabled):**

- `dashboard` - Main dashboard with metrics
- `tasks` - Personal task management
- `clients` - Client management
- `projects` - Project management with AI features

**Toggleable Modules:**

- `assets` - AI-generated assets library
- `marketing` - Marketing content, campaigns, publishing
- `leads` - Lead capture and management
- `pipeline` - Sales pipeline visualization
- `admin` - User administration and module management
- `financeTracking` - Expense tracking, budgets, profitability
- `mcp` - Model Context Protocol for AI queries
- `customerSuccess` - Customer success platform

**AI Tools - Phase 1:**

- `chatbot` - Customer service chatbot
- `productDescriptions` - Product description generator
- `scheduling` - AI scheduling assistant
- `intake` - Client intake automator

**AI Tools - Phase 2:**

- `documentAnalyzer` - Smart document analyzer
- `contentGenerator` - Content generation suite
- `leadScoring` - Lead scoring and CRM assistant
- `priorAuth` - Prior authorization bot

**AI Tools - Phase 3:**

- `inventoryForecasting` - Inventory forecasting engine
- `complianceMonitor` - Compliance monitoring system
- `predictiveMaintenance` - Predictive maintenance platform
- `revenueManagement` - Revenue management AI
- `safetyMonitor` - Safety and compliance monitor

**Infrastructure Modules:**

- `coreInfrastructure` - Core infrastructure features
- `aiMlInfrastructure` - AI/ML infrastructure
- `iotInfrastructure` - IoT infrastructure

**Compliance Modules:**

- `healthcareCompliance` - HIPAA compliance features
- `financialCompliance` - Financial compliance features
- `generalCompliance` - General compliance features

**Demo Modules:**

- `demoAITools` - AI tools demo mode
- `demoMarketing` - Marketing demo mode

### Example Configurations

**Basic CRM:**

```env
ENABLED_MODULES=dashboard,tasks,clients,projects
VITE_ENABLED_MODULES=dashboard,tasks,clients,projects
```

**Sales-focused:**

```env
ENABLED_MODULES=dashboard,tasks,clients,projects,leads,pipeline
VITE_ENABLED_MODULES=dashboard,tasks,clients,projects,leads,pipeline
```

**Full Platform:**

```env
# Leave empty or don't set to enable all modules
ENABLED_MODULES=
VITE_ENABLED_MODULES=
```

---

## Environment-Specific Settings

### Development

```env
NODE_ENV=development
PORT=4000
DATABASE_URL="file:../../prisma/dev.db"
JWT_SECRET="dev-secret-at-least-32-characters-long"
JWT_EXPIRES_IN="1h"
BCRYPT_SALT_ROUNDS=10
LOG_LEVEL=debug
# CORS_ORIGIN not set - allows all origins
```

### Staging

```env
NODE_ENV=production
PORT=4000
DATABASE_URL="postgresql://user:pass@staging-db:5432/pmo_staging"
JWT_SECRET="staging-unique-secret-64-chars-minimum-recommended"
JWT_EXPIRES_IN="24h"
BCRYPT_SALT_ROUNDS=12
LOG_LEVEL=info
CORS_ORIGIN="https://pmo-staging.vercel.app"
```

### Production

```env
NODE_ENV=production
PORT=4000
DATABASE_URL="postgresql://user:pass@prod-db:5432/pmo_prod?sslmode=require"
JWT_SECRET="production-unique-cryptographically-secure-secret-64-chars"
JWT_EXPIRES_IN="24h"
BCRYPT_SALT_ROUNDS=12
LOG_LEVEL=info
CORS_ORIGIN="https://pmo.yourdomain.com"
REDIS_URL="redis://:password@redis-prod:6379"
```

---

## Security Best Practices

### Secret Generation

Generate cryptographically secure secrets:

```bash
# For JWT_SECRET (64 characters recommended)
openssl rand -base64 48

# For API keys or tokens
openssl rand -hex 32
```

### Secret Management

**Do:**

- Use different secrets for each environment
- Store secrets in environment variables, not code
- Rotate secrets quarterly or after team member departures
- Use secret management services (Render Secrets, Vercel Environment Variables)

**Do Not:**

- Commit secrets to git (even in `.env` files)
- Share secrets via Slack, email, or chat
- Use the same secret across environments
- Use weak or predictable secrets

### Environment File Security

Add to `.gitignore`:

```
.env
.env.local
.env.*.local
```

### Variable Validation

The API validates critical environment variables at startup and will fail with clear error messages if:

- Required variables are missing
- `JWT_SECRET` is less than 32 characters
- `BCRYPT_SALT_ROUNDS` is outside 10-14 range
- `DATABASE_URL` has invalid format
- `REDIS_URL` has invalid URL format
- `CORS_ORIGIN` contains invalid URLs

---

## Troubleshooting

### Common Issues

**"Missing required environment variable: JWT_SECRET"**

- Ensure `pmo/apps/api/.env` exists and contains `JWT_SECRET`
- Check that the value is at least 32 characters

**"CORS blocked requests"**

- In development: Ensure `CORS_ORIGIN` is not set (allows all)
- In production: Add your frontend URL to `CORS_ORIGIN`

**"Redis: No REDIS_URL configured"**

- This is informational, not an error
- Redis is optional; features work without it (with reduced performance)

**"Twilio/SendGrid not configured"**

- SMS/email features will be skipped if credentials are missing
- Add credentials to enable notification features

### Verifying Configuration

Check which modules are enabled:

```bash
# API logs enabled modules at startup
npm run dev --workspace pmo-api
# Look for: "Enabled modules: dashboard, tasks, clients, ..."
```

Check API health:

```bash
curl http://localhost:4000/api/healthz
# Returns: {"status":"ok","db":"ok"}
```

---

## Related Documentation

- [Environments Guide](./environments.md) - Deployment environment setup
- [Database Backup and Restore](./db-backup-restore.md) - Database management
- [CLAUDE.md](../CLAUDE.md) - Project development guide
- [Modules Documentation](../Docs/MODULES.md) - Detailed module configuration

---

**Document Maintained By**: Development Team
**Questions?**: Check the troubleshooting section or review the source code in `pmo/apps/api/src/config/env.ts`
