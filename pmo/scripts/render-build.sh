#!/bin/bash
set -e

echo "🚀 Starting Render build process..."
echo ""

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install --ignore-scripts
echo "✅ Dependencies installed"
echo ""

# Step 2: Generate Prisma client
echo "🔨 Generating Prisma client..."
cd apps/api
npx prisma generate
cd ../..
echo "✅ Prisma client generated"
echo ""

# Step 3: Run smart migration deployment (handles failed migrations)
echo "🗄️  Deploying database migrations..."
cd apps/api
bash ../../scripts/deploy-migrations.sh
cd ../..
echo "✅ Migrations deployed"
echo ""

# Step 4: Build the application
echo "🏗️  Building application..."
npm run build
echo "✅ Build complete"
echo ""

echo "🎉 Render build process completed successfully!"
