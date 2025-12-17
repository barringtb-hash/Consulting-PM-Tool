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

# Step 2: Generate Prisma client
# Run from workspace root so prisma.config.ts is auto-detected (contains schema path and datasource url)
echo "Generating Prisma client..."
npx prisma generate
echo "Prisma client generated"
echo ""

# Step 3: Run smart migration deployment (handles failed migrations)
# Run from workspace root so prisma.config.ts is auto-detected
echo "Deploying database migrations..."
if [ -f "$WORKSPACE_ROOT/scripts/deploy-migrations.sh" ]; then
    bash "$WORKSPACE_ROOT/scripts/deploy-migrations.sh"
else
    npx prisma migrate deploy
fi
echo "Migrations deployed"
echo ""

# Step 4: Build the application
echo "Building application..."
npm run build --workspace pmo-api
echo "Build complete"
echo ""

echo "Render build process completed successfully!"
