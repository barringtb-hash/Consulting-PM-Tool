# Contributor Guide

Welcome to the AI CRM Platform monorepo. This document provides essential guidance for contributors working within the `pmo/` workspace.

> **AI Assistants**: For comprehensive documentation including architecture patterns, code conventions, and common tasks, see [../CLAUDE.md](../CLAUDE.md).

## Project Overview

This is a multi-tenant CRM SaaS platform with:

- **CRM Core**: Accounts, Contacts, Opportunities, Pipelines, Activities
- **PMO Module**: Projects, Tasks, Milestones, Meetings (optional)
- **AI Tools**: Chatbot, Document Analyzer (premium add-ons)

## Directory Structure

```
pmo/
├── apps/
│   ├── web/          # React + TypeScript frontend (Vite)
│   └── api/          # Express + TypeScript API server
│       └── src/
│           ├── crm/          # CRM module (Accounts, Opportunities, Activities)
│           ├── modules/      # Feature modules (chatbot, document-analyzer)
│           ├── tenant/       # Multi-tenant context and middleware
│           └── scripts/      # Data migration scripts
├── packages/         # Shared packages (types, utilities, chatbot-widget)
├── prisma/           # Database schema and migrations
├── e2e/              # Playwright E2E tests
└── docs/             # Internal documentation
```

## Development Workflow

### Before You Start

1. Install dependencies from this directory:

   ```bash
   npm install
   ```

2. Set up environment variables:

   ```bash
   cp ../Docs/api.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

3. Initialize the database:
   ```bash
   npx prisma migrate dev --name init
   ```

### Running the Application

```bash
# Start frontend (http://localhost:5173)
npm run dev --workspace pmo-web

# Start API (http://localhost:3001)
npm run dev --workspace pmo-api
```

### Code Quality

Before committing any TypeScript changes:

```bash
npm run lint      # Check for linting errors
npm run test      # Run unit tests
npm run format    # Auto-format code with Prettier
```

### Pre-commit Hooks

Husky runs lint-staged automatically on commit. If hooks are missing after cloning:

```bash
npm run prepare
```

## Code Standards

- **TypeScript**: Use strict mode, explicit return types
- **Formatting**: Prettier handles all formatting (configured at workspace root)
- **Linting**: ESLint with TypeScript and React plugins
- **Unused variables**: Prefix with `_` (e.g., `_unusedParam`)

## Testing

```bash
# All unit tests
npm run test

# API tests only
npm run test --workspace pmo-api

# Web tests only
npm run test --workspace pmo-web

# E2E tests
npm run test:e2e
npm run test:e2e:headed   # With visible browser
npm run test:e2e:ui       # With Playwright UI
```

## Database Operations

```bash
# Create a new migration
npx prisma migrate dev --name <migration-name>

# Apply migrations (production)
npx prisma migrate deploy

# Seed test data
npx prisma db seed

# Open Prisma Studio
npx prisma studio
```

## Additional Resources

- [CLAUDE.md](../CLAUDE.md) - Comprehensive AI assistant guide
- [README.md](../README.md) - Project overview and quickstart
- [CRM-TRANSFORMATION-PLAN.md](../Docs/CRM-TRANSFORMATION-PLAN.md) - CRM architecture and implementation plan
- [TECHNICAL-DEBT-REPORT.md](../Docs/TECHNICAL-DEBT-REPORT.md) - Technical debt tracking (28/28 resolved)
- [AI-Tools.md](../Docs/AI-Tools.md) - AI Chatbot & Document Analyzer documentation
- [Docs/MODULES.md](../Docs/MODULES.md) - Module system documentation
