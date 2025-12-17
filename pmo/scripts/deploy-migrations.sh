#!/bin/bash
set -e

echo "🔍 Checking migration status..."

# This script must be run from the workspace root where prisma/schema.prisma is located
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ prisma/schema.prisma not found in current directory"
    echo "   This script must be run from the workspace root (pmo/)"
    exit 1
fi

SCHEMA_PATH="prisma/schema.prisma"
echo "📁 Running from: $(pwd)"
echo "📁 Using schema: $SCHEMA_PATH"

# Function to extract failed migration name from P3009 error output
extract_failed_migration() {
    local output="$1"
    # Look for the pattern: The `migration_name` migration started at ... failed
    echo "$output" | grep -o 'The `[^`]*` migration started at' | sed 's/^The `\([^`]*\)` migration.*/\1/' | head -1
}

# Function to resolve a failed migration
resolve_failed_migration() {
    local migration_name="$1"

    if [ -z "$migration_name" ]; then
        echo "⚠️  No migration name provided to resolve"
        return 1
    fi

    echo "📋 Attempting to resolve failed migration: $migration_name"

    # Try marking as applied first (for partially applied migrations where columns already exist)
    echo "🔄 Attempt: Marking '$migration_name' as applied..."
    if npx prisma migrate resolve --applied "$migration_name" --schema="$SCHEMA_PATH" 2>&1; then
        echo "✅ Migration '$migration_name' marked as applied"
        return 0
    fi

    echo "⚠️  Could not mark as applied, trying to mark as rolled back..."
    if npx prisma migrate resolve --rolled-back "$migration_name" --schema="$SCHEMA_PATH" 2>&1; then
        echo "✅ Migration '$migration_name' marked as rolled back"
        return 0
    fi

    echo "❌ Could not resolve migration '$migration_name'"
    return 1
}

# Check migration status and capture output
MIGRATION_STATUS=$(npx prisma migrate status --schema="$SCHEMA_PATH" 2>&1 || true)

echo "$MIGRATION_STATUS"

# Pre-check: Look for failed migration indicators in status
# The status might show "failed" state in migration list
if echo "$MIGRATION_STATUS" | grep -q "failed"; then
    echo ""
    echo "⚠️  Status indicates potential failed migration..."

    FAILED_MIGRATION=$(extract_failed_migration "$MIGRATION_STATUS")
    if [ -n "$FAILED_MIGRATION" ]; then
        resolve_failed_migration "$FAILED_MIGRATION"
    fi
fi

echo ""
echo "🚀 Deploying migrations..."

# Capture deploy output to check for P3009 errors
DEPLOY_OUTPUT=$(npx prisma migrate deploy --schema="$SCHEMA_PATH" 2>&1) && DEPLOY_SUCCESS=true || DEPLOY_SUCCESS=false

echo "$DEPLOY_OUTPUT"

if [ "$DEPLOY_SUCCESS" = "true" ]; then
    echo ""
    echo "✅ Migration deployment complete!"
    exit 0
fi

echo ""
echo "❌ Migration deployment failed. Analyzing error..."

# Check for P3009 error (failed migrations blocking new ones)
if echo "$DEPLOY_OUTPUT" | grep -q "P3009"; then
    echo ""
    echo "🔍 Detected P3009 error (failed migration blocking deployment)"

    # Extract the failed migration name from the deploy error output
    FAILED_MIGRATION=$(extract_failed_migration "$DEPLOY_OUTPUT")

    if [ -n "$FAILED_MIGRATION" ]; then
        echo ""
        resolve_failed_migration "$FAILED_MIGRATION"

        echo ""
        echo "🔄 Retrying migration deployment after resolution..."
        DEPLOY_OUTPUT=$(npx prisma migrate deploy --schema="$SCHEMA_PATH" 2>&1) && DEPLOY_SUCCESS=true || DEPLOY_SUCCESS=false
        echo "$DEPLOY_OUTPUT"

        if [ "$DEPLOY_SUCCESS" = "true" ]; then
            echo ""
            echo "✅ Migration deployment complete after resolution!"
            exit 0
        fi

        # If still P3009, there might be another failed migration
        if echo "$DEPLOY_OUTPUT" | grep -q "P3009"; then
            FAILED_MIGRATION=$(extract_failed_migration "$DEPLOY_OUTPUT")
            if [ -n "$FAILED_MIGRATION" ]; then
                resolve_failed_migration "$FAILED_MIGRATION"

                echo ""
                echo "🔄 Final retry of migration deployment..."
                if npx prisma migrate deploy --schema="$SCHEMA_PATH"; then
                    echo ""
                    echo "✅ Migration deployment complete!"
                    exit 0
                fi
            fi
        fi
    else
        echo "⚠️  Could not extract failed migration name from error"
    fi
fi

# Final status check
echo ""
echo "📊 Final migration status:"
npx prisma migrate status --schema="$SCHEMA_PATH" 2>&1 || true

echo ""
echo "❌ Migration deployment still failing. Manual intervention may be required."
echo "   Run: npx prisma migrate status"
echo "   And: npx prisma migrate resolve --applied <migration_name>"
echo "   Or:  npx prisma migrate resolve --rolled-back <migration_name>"
exit 1
