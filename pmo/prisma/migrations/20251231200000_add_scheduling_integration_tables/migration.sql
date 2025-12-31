-- Add missing scheduling integration tables
-- These tables support calendar, video, and payment integrations for the scheduling module

-- ============================================================================
-- ENUMS (create if not exist)
-- ============================================================================

-- CalendarPlatform enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CalendarPlatform') THEN
        CREATE TYPE "CalendarPlatform" AS ENUM ('GOOGLE', 'OUTLOOK');
    END IF;
END$$;

-- VideoPlatform enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VideoPlatform') THEN
        CREATE TYPE "VideoPlatform" AS ENUM ('ZOOM', 'GOOGLE_MEET', 'TEAMS');
    END IF;
END$$;

-- PaymentTiming enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentTiming') THEN
        CREATE TYPE "PaymentTiming" AS ENUM ('BOOKING', 'APPOINTMENT', 'NONE');
    END IF;
END$$;

-- PaymentStatus enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
        CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
    END IF;
END$$;

-- PaymentType enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentType') THEN
        CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'FULL', 'REFUND');
    END IF;
END$$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- CalendarIntegration - OAuth tokens for calendar sync
CREATE TABLE IF NOT EXISTS "CalendarIntegration" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "providerId" INTEGER,
    "platform" "CalendarPlatform" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "calendarId" TEXT NOT NULL,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarIntegration_pkey" PRIMARY KEY ("id")
);

-- VideoMeetingConfig - Video conferencing integration settings
CREATE TABLE IF NOT EXISTS "VideoMeetingConfig" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "platform" "VideoPlatform" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "defaultSettings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoMeetingConfig_pkey" PRIMARY KEY ("id")
);

-- PaymentConfig - Stripe payment configuration for scheduling
CREATE TABLE IF NOT EXISTS "PaymentConfig" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "stripeAccountId" TEXT,
    "stripeOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "collectPaymentAt" "PaymentTiming" NOT NULL DEFAULT 'BOOKING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentConfig_pkey" PRIMARY KEY ("id")
);

-- PaymentTransaction - Payment records for appointments
CREATE TABLE IF NOT EXISTS "PaymentTransaction" (
    "id" SERIAL NOT NULL,
    "appointmentId" INTEGER NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "type" "PaymentType" NOT NULL,
    "processedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- UNIQUE CONSTRAINTS
-- ============================================================================

-- Unique constraint for CalendarIntegration (configId + providerId + platform)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CalendarIntegration_configId_providerId_platform_key'
    ) THEN
        ALTER TABLE "CalendarIntegration" ADD CONSTRAINT "CalendarIntegration_configId_providerId_platform_key"
            UNIQUE ("configId", "providerId", "platform");
    END IF;
END$$;

-- Unique constraint for VideoMeetingConfig (configId + platform)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'VideoMeetingConfig_configId_platform_key'
    ) THEN
        ALTER TABLE "VideoMeetingConfig" ADD CONSTRAINT "VideoMeetingConfig_configId_platform_key"
            UNIQUE ("configId", "platform");
    END IF;
END$$;

-- Unique constraint for PaymentConfig (configId)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PaymentConfig_configId_key'
    ) THEN
        ALTER TABLE "PaymentConfig" ADD CONSTRAINT "PaymentConfig_configId_key"
            UNIQUE ("configId");
    END IF;
END$$;

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

-- CalendarIntegration -> SchedulingConfig
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'CalendarIntegration_configId_fkey'
        AND table_name = 'CalendarIntegration'
    ) THEN
        ALTER TABLE "CalendarIntegration" ADD CONSTRAINT "CalendarIntegration_configId_fkey"
            FOREIGN KEY ("configId") REFERENCES "SchedulingConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

-- CalendarIntegration -> Provider
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'CalendarIntegration_providerId_fkey'
        AND table_name = 'CalendarIntegration'
    ) THEN
        ALTER TABLE "CalendarIntegration" ADD CONSTRAINT "CalendarIntegration_providerId_fkey"
            FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END$$;

-- VideoMeetingConfig -> SchedulingConfig
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'VideoMeetingConfig_configId_fkey'
        AND table_name = 'VideoMeetingConfig'
    ) THEN
        ALTER TABLE "VideoMeetingConfig" ADD CONSTRAINT "VideoMeetingConfig_configId_fkey"
            FOREIGN KEY ("configId") REFERENCES "SchedulingConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

-- PaymentConfig -> SchedulingConfig
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'PaymentConfig_configId_fkey'
        AND table_name = 'PaymentConfig'
    ) THEN
        ALTER TABLE "PaymentConfig" ADD CONSTRAINT "PaymentConfig_configId_fkey"
            FOREIGN KEY ("configId") REFERENCES "SchedulingConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

-- PaymentTransaction -> Appointment
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'PaymentTransaction_appointmentId_fkey'
        AND table_name = 'PaymentTransaction'
    ) THEN
        ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_appointmentId_fkey"
            FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS "CalendarIntegration_configId_idx" ON "CalendarIntegration"("configId");
CREATE INDEX IF NOT EXISTS "VideoMeetingConfig_configId_idx" ON "VideoMeetingConfig"("configId");
CREATE INDEX IF NOT EXISTS "PaymentConfig_configId_idx" ON "PaymentConfig"("configId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_appointmentId_idx" ON "PaymentTransaction"("appointmentId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");
