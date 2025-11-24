-- Fix Marketing Content Migration
-- This adds the missing fields to the existing MarketingContent table

-- Step 1: Add IDEA and READY to ContentStatus enum (if not already there)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'IDEA' AND enumtypid = 'public."ContentStatus"'::regtype) THEN
        ALTER TYPE "ContentStatus" ADD VALUE 'IDEA';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'READY' AND enumtypid = 'public."ContentStatus"'::regtype) THEN
        ALTER TYPE "ContentStatus" ADD VALUE 'READY';
    END IF;
END $$;

-- Step 2: Create ContentChannel enum (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentChannel') THEN
        CREATE TYPE "ContentChannel" AS ENUM ('WEB', 'LINKEDIN', 'INSTAGRAM', 'TWITTER', 'EMAIL', 'GENERIC');
    END IF;
END $$;

-- Step 3: Add missing columns to MarketingContent table
ALTER TABLE "MarketingContent"
  ADD COLUMN IF NOT EXISTS "slug" TEXT,
  ADD COLUMN IF NOT EXISTS "channel" "ContentChannel",
  ADD COLUMN IF NOT EXISTS "sourceContentId" INTEGER;

-- Step 4: Create indexes (if not already exist)
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingContent_slug_key" ON "MarketingContent"("slug");
CREATE INDEX IF NOT EXISTS "MarketingContent_slug_idx" ON "MarketingContent"("slug");

-- Step 5: Add foreign key constraint for sourceContentId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'MarketingContent_sourceContentId_fkey'
    ) THEN
        ALTER TABLE "MarketingContent"
        ADD CONSTRAINT "MarketingContent_sourceContentId_fkey"
        FOREIGN KEY ("sourceContentId")
        REFERENCES "MarketingContent"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
