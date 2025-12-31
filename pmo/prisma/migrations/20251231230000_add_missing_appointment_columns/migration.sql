-- Add missing scheduling tables and columns
-- These tables/columns are defined in the Prisma schema but were not present in the database

-- ============================================================================
-- MISSING TABLES
-- ============================================================================

-- BookingPage - Public booking pages for scheduling
CREATE TABLE IF NOT EXISTS "BookingPage" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#3B82F6',
    "showProviderSelection" BOOLEAN NOT NULL DEFAULT true,
    "showAppointmentTypes" BOOLEAN NOT NULL DEFAULT true,
    "requirePhone" BOOLEAN NOT NULL DEFAULT true,
    "requireIntakeForm" BOOLEAN NOT NULL DEFAULT false,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingPage_pkey" PRIMARY KEY ("id")
);

-- BookingIntakeForm - Custom intake forms for booking pages
CREATE TABLE IF NOT EXISTS "BookingIntakeForm" (
    "id" SERIAL NOT NULL,
    "bookingPageId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingIntakeForm_pkey" PRIMARY KEY ("id")
);

-- BookingIntakeFormResponse - Responses to booking intake forms
CREATE TABLE IF NOT EXISTS "BookingIntakeFormResponse" (
    "id" SERIAL NOT NULL,
    "formId" INTEGER NOT NULL,
    "appointmentId" INTEGER NOT NULL,
    "responses" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingIntakeFormResponse_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- MISSING COLUMNS ON EXISTING TABLES
-- ============================================================================

-- Appointment table missing columns
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "bookingPageId" INTEGER;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "confirmationCode" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "customerTimezone" TEXT;

-- Video meeting columns for Appointment
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "videoMeetingUrl" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "videoMeetingId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "videoMeetingPassword" TEXT;

-- AppointmentType table missing columns (depositPercent may have been added manually)
ALTER TABLE "AppointmentType" ADD COLUMN IF NOT EXISTS "depositPercent" INTEGER;

-- ============================================================================
-- UNIQUE CONSTRAINTS
-- ============================================================================

-- BookingPage slug must be unique
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'BookingPage_slug_key'
    ) THEN
        ALTER TABLE "BookingPage" ADD CONSTRAINT "BookingPage_slug_key"
            UNIQUE ("slug");
    END IF;
END$$;

-- Appointment confirmationCode must be unique
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_confirmationCode_key'
    ) THEN
        ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_confirmationCode_key"
            UNIQUE ("confirmationCode");
    END IF;
END$$;

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

-- BookingPage -> SchedulingConfig
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'BookingPage_configId_fkey'
        AND table_name = 'BookingPage'
    ) THEN
        ALTER TABLE "BookingPage" ADD CONSTRAINT "BookingPage_configId_fkey"
            FOREIGN KEY ("configId") REFERENCES "SchedulingConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

-- BookingIntakeForm -> BookingPage
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'BookingIntakeForm_bookingPageId_fkey'
        AND table_name = 'BookingIntakeForm'
    ) THEN
        ALTER TABLE "BookingIntakeForm" ADD CONSTRAINT "BookingIntakeForm_bookingPageId_fkey"
            FOREIGN KEY ("bookingPageId") REFERENCES "BookingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

-- BookingIntakeFormResponse -> BookingIntakeForm
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'BookingIntakeFormResponse_formId_fkey'
        AND table_name = 'BookingIntakeFormResponse'
    ) THEN
        ALTER TABLE "BookingIntakeFormResponse" ADD CONSTRAINT "BookingIntakeFormResponse_formId_fkey"
            FOREIGN KEY ("formId") REFERENCES "BookingIntakeForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

-- BookingIntakeFormResponse -> Appointment
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'BookingIntakeFormResponse_appointmentId_fkey'
        AND table_name = 'BookingIntakeFormResponse'
    ) THEN
        ALTER TABLE "BookingIntakeFormResponse" ADD CONSTRAINT "BookingIntakeFormResponse_appointmentId_fkey"
            FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

-- Appointment -> BookingPage
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Appointment_bookingPageId_fkey'
        AND table_name = 'Appointment'
    ) THEN
        ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_bookingPageId_fkey"
            FOREIGN KEY ("bookingPageId") REFERENCES "BookingPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END$$;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS "BookingPage_slug_idx" ON "BookingPage"("slug");
CREATE INDEX IF NOT EXISTS "BookingPage_configId_idx" ON "BookingPage"("configId");
CREATE INDEX IF NOT EXISTS "BookingIntakeForm_bookingPageId_idx" ON "BookingIntakeForm"("bookingPageId");
CREATE INDEX IF NOT EXISTS "BookingIntakeFormResponse_formId_idx" ON "BookingIntakeFormResponse"("formId");
CREATE INDEX IF NOT EXISTS "BookingIntakeFormResponse_appointmentId_idx" ON "BookingIntakeFormResponse"("appointmentId");
CREATE INDEX IF NOT EXISTS "Appointment_bookingPageId_idx" ON "Appointment"("bookingPageId");
