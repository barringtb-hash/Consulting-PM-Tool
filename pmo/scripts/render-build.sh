#!/bin/bash
set -e

echo "Starting Render build process..."
echo "Current directory: $(pwd)"
echo ""

# Determine if we're in the workspace root (pmo) or apps/api
if [ -f "package.json" ] && grep -q "ai-consulting-pmo-monorepo" package.json 2>/dev/null; then
    echo "Running from workspace root (pmo/)"
    WORKSPACE_ROOT="."
    API_DIR="apps/api"
elif [ -f "package.json" ] && grep -q "pmo-api" package.json 2>/dev/null; then
    echo "WARNING: Running from apps/api - navigating to workspace root"
    WORKSPACE_ROOT="../.."
    API_DIR="."
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
echo "Generating Prisma client..."
cd "$API_DIR"
npx prisma generate
if [ "$API_DIR" != "." ]; then
    cd "$WORKSPACE_ROOT"
fi
echo "Prisma client generated"
echo ""

# Step 3: Run smart migration deployment (handles failed migrations)
echo "Deploying database migrations..."
cd "$API_DIR"
if [ -f "../../scripts/deploy-migrations.sh" ]; then
    bash ../../scripts/deploy-migrations.sh
else
    npx prisma migrate deploy
fi
if [ "$API_DIR" != "." ]; then
    cd "$WORKSPACE_ROOT"
fi
echo "Migrations deployed"
echo ""

# Step 4: Build the application
echo "Building application..."
npm run build --workspace pmo-api
echo "Build complete"
echo ""

echo "Render build process completed successfully!"
