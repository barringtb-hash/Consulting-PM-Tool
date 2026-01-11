# Database Migrations

Create and run Prisma database migrations.

## Instructions

Run from the `/pmo` directory:

```bash
# Create a new migration
npx prisma migrate dev --name <descriptive_name>

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development only - destroys data)
npx prisma migrate reset

# View database with Prisma Studio
npx prisma studio
```

## Migration Naming

Use descriptive snake_case names:

- `add_user_avatar`
- `create_crm_contacts_table`
- `add_opportunity_stage_history`

## After Schema Changes

1. Modify `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <name>`
3. Update seed data in `prisma/seed.ts` if needed
4. Run `npx prisma db seed` to update test data

## Database

- Development: SQLite (`file:../../prisma/dev.db`)
- Production: PostgreSQL
