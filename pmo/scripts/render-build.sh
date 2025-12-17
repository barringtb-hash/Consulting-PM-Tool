#!/bin/bash
set -e

echo "Starting Render build process..."
echo "Current directory: $(pwd)"
echo ""

# Save starting directory as absolute path
START_DIR="$(pwd)"

# Determine if we're in the workspace root (pmo) or apps/api
if [ -f "package.json" ] && grep -q "ai-consulting-pmo-monorepo" package.json 2>/dev/null; then
    echo "Running from workspace root (pmo/)"
    WORKSPACE_ROOT="$START_DIR"
    API_DIR="$START_DIR/apps/api"
elif [ -f "package.json" ] && grep -q "pmo-api" package.json 2>/dev/null; then
    echo "WARNING: Running from apps/api - navigating to workspace root"
    WORKSPACE_ROOT="$(cd ../.. && pwd)"
    API_DIR="$START_DIR"
    cd "$WORKSPACE_ROOT"
    echo "Changed to: $(pwd)"
else
    echo "ERROR: Cannot determine project root. Please run from pmo/ or pmo/apps/api"
    exit 1
fi

# Step 1: Install dependencies from workspace root
echo ""
echo "Installing dependencies..."
npm install
echo "Dependencies installed"
echo ""

# Define schema path for Prisma 7 compatibility
SCHEMA_PATH="$WORKSPACE_ROOT/prisma/schema.prisma"

# Step 2: Generate Prisma client (run from workspace root where prisma.config.ts is)
echo "Generating Prisma client..."
npx prisma generate --schema "$SCHEMA_PATH"
echo "Prisma client generated"
echo ""

# Step 3: Run smart migration deployment (run from workspace root where prisma.config.ts is)
echo "Deploying database migrations..."
if [ -f "$WORKSPACE_ROOT/scripts/deploy-migrations.sh" ]; then
    bash "$WORKSPACE_ROOT/scripts/deploy-migrations.sh" "$SCHEMA_PATH"
else
    npx prisma migrate deploy --schema "$SCHEMA_PATH"
fi
echo "Migrations deployed"
echo ""

# Step 4: Build the application
echo "Building application..."
npm run build --workspace pmo-api
echo "Build complete"
echo ""

echo "Render build process completed successfully!"
