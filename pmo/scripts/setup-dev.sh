#!/bin/bash

# Development environment setup script for AI Consulting PMO Platform
# This script automates the initial setup process

set -e

echo "🚀 AI Consulting PMO Platform - Development Setup"
echo "=================================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ] || [ ! -d "prisma" ]; then
  echo "❌ Error: This script must be run from the pmo/ directory"
  exit 1
fi

# Step 1: Create API .env file
echo "📝 Step 1: Creating API environment file..."
if [ ! -f "apps/api/.env" ]; then
  if [ -f "../Docs/api.env.example" ]; then
    cp ../Docs/api.env.example apps/api/.env
    echo "✅ Created apps/api/.env from example"
  else
    cat > apps/api/.env << 'EOF'
# PostgreSQL database connection string (default)
DATABASE_URL="postgresql://postgres@localhost:5432/pmo_dev"

# Alternative: SQLite (uncomment this and comment out PostgreSQL above)
# DATABASE_URL="file:./dev.db"

# Auth and security
JWT_SECRET="replace-with-a-long-random-secret-$(openssl rand -base64 32)"
JWT_EXPIRES_IN="1h"
BCRYPT_SALT_ROUNDS=10

# Server configuration
PORT=4000
NODE_ENV="development"
EOF
    echo "✅ Created apps/api/.env with defaults"
  fi
else
  echo "ℹ️  apps/api/.env already exists, skipping"
fi

# Step 2: Create Web .env file
echo ""
echo "📝 Step 2: Creating Web environment file..."
if [ ! -f "apps/web/.env" ]; then
  cp apps/web/.env.example apps/web/.env
  echo "✅ Created apps/web/.env (using Vite proxy)"
else
  echo "ℹ️  apps/web/.env already exists, skipping"
fi

# Step 3: Install dependencies
echo ""
echo "📦 Step 3: Installing dependencies..."
npm install

# Step 4: Detect which database to use
echo ""
echo "🗄️  Step 4: Database setup"
if grep -q "postgresql://" apps/api/.env; then
  echo "Detected PostgreSQL configuration"
  DB_TYPE="postgresql"
else
  echo "Detected SQLite configuration"
  DB_TYPE="sqlite"
fi

# Check if PostgreSQL is required and available
if [ "$DB_TYPE" = "postgresql" ]; then
  if ! command -v psql &> /dev/null; then
    echo "⚠️  Warning: PostgreSQL is configured but psql is not found"
    echo "   Please install PostgreSQL or switch to SQLite in apps/api/.env"
    echo ""
    echo "   To use SQLite instead:"
    echo '   Edit apps/api/.env and set: DATABASE_URL="file:./dev.db"'
    exit 1
  fi

  # Check if PostgreSQL is running
  if ! pg_isready -q 2>/dev/null; then
    echo "⚠️  Warning: PostgreSQL is not running"
    echo "   Please start PostgreSQL:"
    echo "   - macOS: brew services start postgresql"
    echo "   - Linux: sudo service postgresql start"
    exit 1
  fi

  # Create database if it doesn't exist
  DB_NAME=$(grep DATABASE_URL apps/api/.env | cut -d'/' -f4 | tr -d '"')
  if [ -z "$DB_NAME" ]; then
    DB_NAME="pmo_dev"
  fi

  echo "Creating database: $DB_NAME"
  psql -U postgres -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME" && echo "  Database already exists" || {
    createdb -U postgres "$DB_NAME" 2>/dev/null || psql -U postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
    echo "✅ Database created"
  }
fi

# Step 5: Run Prisma migrations
echo ""
echo "📊 Step 5: Running database migrations..."
npx prisma migrate deploy || {
  echo "⚠️  Prisma migrate failed, trying dev mode..."
  npx prisma migrate dev --name init
}

# Step 6: Generate Prisma Client
echo ""
echo "🔧 Step 6: Generating Prisma Client..."
npx prisma generate

# Step 7: Seed database
echo ""
echo "🌱 Step 7: Seeding database with test users..."
npx tsx prisma/seed.ts || echo "⚠️  Seed skipped (may already be seeded)"

# Summary
echo ""
echo "=================================================="
echo "✅ Setup Complete!"
echo "=================================================="
echo ""
echo "Test Accounts:"
echo "  Admin:      admin@pmo.test / AdminDemo123!"
echo "  User 1:     avery.chen@pmo.test / PmoDemo123!"
echo "  User 2:     priya.desai@pmo.test / PmoDemo123!"
echo "  User 3:     marco.silva@pmo.test / PmoDemo123!"
echo ""
echo "Next Steps:"
echo "  1. Start the API:  npm run dev --workspace pmo-api"
echo "  2. Start the Web:  npm run dev --workspace pmo-web"
echo "  3. Open browser:   http://localhost:5173"
echo ""
echo "Happy coding! 🎉"
