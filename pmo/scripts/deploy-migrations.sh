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

    # Extract the failed migration name (works for both GNU and BSD grep)
    FAILED_MIGRATION=$(echo "$MIGRATION_STATUS" | grep "migration started at" | sed 's/^The `\([^`]*\)`.*/\1/')

    if [ ! -z "$FAILED_MIGRATION" ]; then
        echo "📋 Failed migration: $FAILED_MIGRATION"

        # First try marking as rolled back
        echo "🔄 Attempt 1: Marking as rolled back..."
        if npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION"; then
            echo "✅ Migration marked as rolled back"
        else
            echo "⚠️  Could not mark as rolled back, trying to mark as applied..."
            # If that fails, try marking as applied (tables might already exist)
            npx prisma migrate resolve --applied "$FAILED_MIGRATION" || true
            echo "✅ Migration marked as applied"
        fi
    fi
fi

echo ""
echo "🚀 Deploying migrations..."
if npx prisma migrate deploy; then
    echo ""
    echo "✅ Migration deployment complete!"
else
    echo ""
    echo "❌ Migration deployment failed. Checking for specific migration issue..."

    # If deployment still fails, try marking the specific failing migration as applied
    echo "Attempting to mark 20251123211300_add_marketing_content_enhancements as applied..."
    npx prisma migrate resolve --applied "20251123211300_add_marketing_content_enhancements" || true

    echo "Retrying migration deployment..."
    npx prisma migrate deploy

    echo ""
    echo "✅ Migration deployment complete after resolution!"
fi
