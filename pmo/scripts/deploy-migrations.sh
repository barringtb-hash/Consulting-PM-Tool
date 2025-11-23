#!/bin/bash
set -e

echo "🔍 Checking migration status..."

# Stay in the calling directory (apps/api) where node_modules with Prisma CLI exists
# The Prisma schema path is configured in package.json: "prisma": { "schema": "../../prisma/schema.prisma" }

# Check migration status and capture output
MIGRATION_STATUS=$(npx prisma migrate status 2>&1 || true)

echo "$MIGRATION_STATUS"

# Check if there's a failed migration
if echo "$MIGRATION_STATUS" | grep -q "failed migrations"; then
    echo ""
    echo "⚠️  Found failed migrations. Attempting to resolve..."

    # Extract the failed migration name
    FAILED_MIGRATION=$(echo "$MIGRATION_STATUS" | grep -oP '(?<=The `).*(?=` migration)')

    if [ ! -z "$FAILED_MIGRATION" ]; then
        echo "📋 Failed migration: $FAILED_MIGRATION"
        echo "🔄 Marking as rolled back..."

        # Mark the failed migration as rolled back
        npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION"

        echo "✅ Migration marked as rolled back"
    fi
fi

echo ""
echo "🚀 Deploying migrations..."
npx prisma migrate deploy

echo ""
echo "✅ Migration deployment complete!"
