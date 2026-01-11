# User Creation and Deployment Guide

This guide covers the automated user creation system and deployment procedures for the Consulting PM Tool.

## Overview

User creation is handled through **Prisma** and **Node.js** only - never through raw SQL. This ensures:
- Consistent password hashing with bcryptjs
- Proper validation and error handling
- Audit trail and type safety
- Works across all environments (dev, staging, prod)

## Available User Creation Methods

### 1. Seed Script (Demo/Initial Setup)

The Prisma seed script creates 4 demo users automatically.

**Demo Users:**
- **Avery Chen** - avery.chen@pmo.test / PmoDemo123!
- **Priya Desai** - priya.desai@pmo.test / PmoDemo123!
- **Marco Silva** - marco.silva@pmo.test / PmoDemo123!
- **Testing Admin** - admin@pmo.test / AdminDemo123!

**Run locally:**
```bash
cd pmo
npx prisma db seed
```

**Run in production (Render web shell):**
```bash
cd /opt/render/project/src/pmo/apps/api
DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy && npx prisma db seed
```

### 2. HTTP API Endpoint

**Endpoint:** `POST /api/users`

**Authentication:** Requires valid JWT token (any authenticated user can create users)

**Request body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "timezone": "America/Chicago"
}
```

**Password requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

**Response (201):**
```json
{
  "id": 5,
  "name": "John Doe",
  "email": "john@example.com",
  "timezone": "America/Chicago",
  "createdAt": "2025-01-15T12:00:00.000Z",
  "updatedAt": "2025-01-15T12:00:00.000Z"
}
```

**Error responses:**
- `400` - Validation failed (missing fields, weak password, etc.)
- `401` - Unauthorized (not logged in)
- `409` - Email already in use
- `500` - Internal server error

**Example with curl:**
```bash
curl -X POST https://your-api.onrender.com/api/users \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "timezone": "America/Chicago"
  }'
```

### 3. Admin UI

**URL:** `/admin/users/new`

1. Log in to the web application
2. Navigate to "Create user" in the top navigation
3. Fill out the form:
   - Name
   - Email
   - Password (must meet requirements)
   - Timezone (dropdown)
4. Click "Create User"
5. Success message will appear, and form will reset

**Available timezones:**
- Eastern Time (America/New_York)
- Central Time (America/Chicago)
- Mountain Time (America/Denver)
- Pacific Time (America/Los_Angeles)
- UTC
- London (Europe/London)
- Paris (Europe/Paris)
- Tokyo (Asia/Tokyo)
- Shanghai (Asia/Shanghai)
- Sydney (Australia/Sydney)

### 4. CLI Script

**Local usage:**
```bash
cd pmo/apps/api
npm run create-user -- "John Doe" "john@example.com" "SecurePass123!" "America/Chicago"
```

**With custom database URL:**
```bash
DATABASE_URL="postgres://..." npm run create-user -- "John Doe" "john@example.com" "SecurePass123!" "America/Chicago"
```

**Production (Render shell):**
```bash
cd /opt/render/project/src/pmo/apps/api
DATABASE_URL="$DATABASE_URL" npm run create-user -- "Admin User" "admin@example.com" "AdminPass123!" "UTC"
```

## Production Deployment on Render

### Initial Setup / Seeding Production Database

1. **Access Render web shell** for your API service (`consulting-pm-api`)

2. **Navigate to API directory:**
   ```bash
   cd /opt/render/project/src/pmo/apps/api
   ```

3. **Run migrations and seed (one command):**
   ```bash
   DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy && npx prisma db seed
   ```

   This will:
   - Apply any pending Prisma migrations
   - Create the 4 demo users (idempotent - safe to run multiple times)

### Creating Additional Users in Production

**Option A: Via Render Web Shell (CLI)**
```bash
cd /opt/render/project/src/pmo/apps/api
DATABASE_URL="$DATABASE_URL" npm run create-user -- "Staff User" "staff@yourcompany.com" "StaffPass123!" "America/New_York"
```

**Option B: Via Admin UI**
1. Deploy the latest code with the admin UI
2. Log in to your production app
3. Navigate to `/admin/users/new`
4. Create users through the web interface

**Option C: Via API (from another tool)**
Use curl, Postman, or any HTTP client to POST to `/api/users` (see API documentation above)

### Environment Variables

Ensure these are set in Render:

```bash
DATABASE_URL=<your-postgres-url>
JWT_SECRET=<your-secret-key>
BCRYPT_SALT_ROUNDS=10
NODE_ENV=production
```

### Automated Deployment (Optional)

To automate seeding on deployment, add to your Render build/start script:

**Build Command (with automatic migration error recovery):**
```bash
cd pmo/apps/api && npm install --ignore-scripts && npx prisma generate && npm run prisma:migrate:deploy && npm run build
```

**Note:**
- The `prisma:migrate:deploy` script automatically handles failed migrations by marking them as rolled back before reapplying
- The seed is idempotent (uses `upsert`), so it's safe to run on every deployment
- To seed data, add `&& npx prisma db seed` to the end of the build command

## Development Workflow

### Local Development

1. **Set up database:**
   ```bash
   cd pmo
   npx prisma migrate dev
   ```

2. **Seed demo data:**
   ```bash
   npx prisma db seed
   ```

3. **Start API:**
   ```bash
   cd apps/api
   npm run dev
   ```

4. **Start Web:**
   ```bash
   cd apps/web
   npm run dev
   ```

5. **Test user creation:**
   - Log in as one of the demo users
   - Visit http://localhost:5173/admin/users/new
   - Create a test user

### Testing the API

**Get all users (authenticated):**
```bash
curl http://localhost:4000/api/users \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

**Create user (authenticated):**
```bash
curl -X POST http://localhost:4000/api/users \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPass123!",
    "timezone": "UTC"
  }'
```

## Security Considerations

1. **Passwords are never stored in plain text**
   - Always hashed with bcryptjs using configurable salt rounds
   - Password hashes are never returned in API responses

2. **Email uniqueness is enforced**
   - At database level (unique constraint)
   - At service level (checked before creation)

3. **Authentication required**
   - All user creation endpoints require valid JWT token
   - TODO: Add role-based access control (admin-only)

4. **Input validation**
   - Zod schema validation on all inputs
   - Password complexity requirements enforced
   - SQL injection protection via Prisma

5. **No raw SQL**
   - All database operations go through Prisma ORM
   - Type-safe queries
   - Migration-based schema changes

## Troubleshooting

### Failed Migration Error (P3009)

**Symptom:** Deployment fails with error:
```
Error: P3009
migrate found failed migrations in the target database
```

**Solution:**
The deployment script at `pmo/scripts/deploy-migrations.sh` automatically handles this. Ensure your Render build command uses:
```bash
cd pmo/apps/api && npm install --ignore-scripts && npx prisma generate && npm run prisma:migrate:deploy && npm run build
```

**Manual resolution (if needed):**
1. Access Render web shell
2. Navigate to: `cd /opt/render/project/src/pmo/apps/api`
3. Check status: `npx prisma migrate status`
4. Resolve failed migration: `npx prisma migrate resolve --rolled-back "MIGRATION_NAME"`
5. Deploy: `npx prisma migrate deploy`

### "Email already in use" error
- User with that email already exists
- Check existing users: `SELECT email FROM "User";`
- Use a different email or update existing user

### "Invalid token" error
- JWT token expired or invalid
- Log in again to get fresh token
- Check JWT_SECRET is configured

### Seed fails on production
- Ensure DATABASE_URL is accessible
- Check Prisma can connect: `npx prisma db pull`
- Verify migrations are applied: `npx prisma migrate status`

### CLI script fails
- Ensure you're in `pmo/apps/api` directory
- Check DATABASE_URL environment variable is set
- Verify dependencies are installed: `npm ci`

## Future Enhancements

- [ ] Add role-based access control (User/Admin roles)
- [ ] Implement user update/delete endpoints
- [ ] Add password reset functionality
- [ ] Create user management admin panel (list/edit/delete)
- [ ] Add email verification workflow
- [ ] Implement audit logging for user operations
- [ ] Add bulk user import from CSV
- [ ] Create GitHub Actions workflow for automated seeding

## Quick Reference

| Method | Best For | Auth Required | Command |
|--------|----------|---------------|---------|
| Seed Script | Initial setup, demo data | No | `npx prisma db seed` |
| HTTP API | Programmatic integration | Yes | `POST /api/users` |
| Admin UI | Non-technical users | Yes | Navigate to `/admin/users/new` |
| CLI Script | Ops/DevOps, automation | No | `npm run create-user -- ...` |
