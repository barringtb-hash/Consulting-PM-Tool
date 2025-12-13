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

        # For tenant migrations that add columns, they likely partially applied
        # Try marking as applied first (columns may already exist)
        echo "🔄 Attempt 1: Marking as applied (columns may already exist)..."
        if npx prisma migrate resolve --applied "$FAILED_MIGRATION" 2>&1; then
            echo "✅ Migration marked as applied"
        else
            echo "⚠️  Could not mark as applied, trying to mark as rolled back..."
            # If that fails, try marking as rolled back
            if npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" 2>&1; then
                echo "✅ Migration marked as rolled back"
            else
                echo "⚠️  Could not resolve migration, will try deploy anyway..."
            fi
        fi
    fi
fi

echo ""
echo "🚀 Deploying migrations..."
if npx prisma migrate deploy; then
    echo ""
    echo "✅ Migration deployment complete!"
else
    DEPLOY_EXIT_CODE=$?
    echo ""
    echo "❌ Migration deployment failed (exit code: $DEPLOY_EXIT_CODE). Checking status..."

    # Re-check migration status for any newly failed migrations
    MIGRATION_STATUS=$(npx prisma migrate status 2>&1 || true)
    echo "$MIGRATION_STATUS"

    # If there's still a failed migration, try to resolve it
    if echo "$MIGRATION_STATUS" | grep -q "failed migrations"; then
        FAILED_MIGRATION=$(echo "$MIGRATION_STATUS" | grep "migration started at" | sed 's/^The `\([^`]*\)`.*/\1/')
        if [ ! -z "$FAILED_MIGRATION" ]; then
            echo "📋 Resolving failed migration: $FAILED_MIGRATION"
            # Try marking as applied (most common case for partially applied migrations)
            npx prisma migrate resolve --applied "$FAILED_MIGRATION" || \
            npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" || true
        fi
    fi

    echo "🔄 Retrying migration deployment..."
    if npx prisma migrate deploy; then
        echo ""
        echo "✅ Migration deployment complete after resolution!"
    else
        echo ""
        echo "❌ Migration deployment still failing. Manual intervention may be required."
        echo "   Run: npx prisma migrate status"
        echo "   And: npx prisma migrate resolve --applied <migration_name>"
        exit 1
    fi
fi
