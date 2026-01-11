-- Create Type B Shift Scheduling tables
-- These tables support employee/shift management for businesses

-- Create enums for shift scheduling
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'SEASONAL', 'TEMPORARY');
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ShiftStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'CANCELLED');
CREATE TYPE "AvailabilityType" AS ENUM ('AVAILABLE', 'PREFERRED', 'UNAVAILABLE');
CREATE TYPE "TimeOffType" AS ENUM ('VACATION', 'SICK', 'PERSONAL', 'BEREAVEMENT', 'JURY_DUTY', 'UNPAID', 'OTHER');
CREATE TYPE "TimeOffStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED');
CREATE TYPE "SwapStatus" AS ENUM ('PENDING', 'PEER_APPROVED', 'APPROVED', 'DENIED', 'CANCELLED', 'EXPIRED');

-- Create ShiftSchedulingConfig table
CREATE TABLE "ShiftSchedulingConfig" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" INTEGER,
    "schedulingConfigId" INTEGER,
    "businessName" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "weekStartDay" INTEGER NOT NULL DEFAULT 0,
    "weeklyOvertimeThreshold" INTEGER NOT NULL DEFAULT 40,
    "dailyOvertimeThreshold" INTEGER,
    "overtimeMultiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.5,
    "minRestBetweenShifts" INTEGER NOT NULL DEFAULT 8,
    "maxConsecutiveDays" INTEGER NOT NULL DEFAULT 6,
    "requireBreaks" BOOLEAN NOT NULL DEFAULT true,
    "breakDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "breakAfterHours" INTEGER NOT NULL DEFAULT 6,
    "schedulePublishLeadDays" INTEGER NOT NULL DEFAULT 7,
    "enableShiftReminders" BOOLEAN NOT NULL DEFAULT true,
    "reminderHoursBefore" INTEGER NOT NULL DEFAULT 12,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftSchedulingConfig_pkey" PRIMARY KEY ("id")
);

-- Create ShiftRole table
CREATE TABLE "ShiftRole" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#10B981',
    "defaultHourlyRate" DECIMAL(10,2),
    "requiredSkills" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftRole_pkey" PRIMARY KEY ("id")
);

-- Create ShiftLocation table
CREATE TABLE "ShiftLocation" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "timezone" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftLocation_pkey" PRIMARY KEY ("id")
);

-- Create ShiftEmployee table
CREATE TABLE "ShiftEmployee" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "userId" INTEGER,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "employeeNumber" TEXT,
    "roleId" INTEGER,
    "hourlyRate" DECIMAL(10,2),
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "hireDate" TIMESTAMP(3),
    "skills" JSONB,
    "certifications" JSONB,
    "maxHoursPerWeek" INTEGER,
    "minHoursPerWeek" INTEGER,
    "preferredLocations" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftEmployee_pkey" PRIMARY KEY ("id")
);

-- Create ShiftSchedule table
CREATE TABLE "ShiftSchedule" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "name" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "publishedBy" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftSchedule_pkey" PRIMARY KEY ("id")
);

-- Create Shift table
CREATE TABLE "Shift" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "scheduleId" INTEGER,
    "employeeId" INTEGER,
    "roleId" INTEGER,
    "locationId" INTEGER,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" "ShiftStatus" NOT NULL DEFAULT 'SCHEDULED',
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- Create EmployeeAvailability table
CREATE TABLE "EmployeeAvailability" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER,
    "specificDate" TIMESTAMP(3),
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "type" "AvailabilityType" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeAvailability_pkey" PRIMARY KEY ("id")
);

-- Create TimeOffRequest table
CREATE TABLE "TimeOffRequest" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "type" "TimeOffType" NOT NULL,
    "reason" TEXT,
    "status" "TimeOffStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeOffRequest_pkey" PRIMARY KEY ("id")
);

-- Create ShiftSwapRequest table
CREATE TABLE "ShiftSwapRequest" (
    "id" SERIAL NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "targetEmployeeId" INTEGER,
    "offeredShiftId" INTEGER,
    "status" "SwapStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "peerApprovedAt" TIMESTAMP(3),
    "managerApprovedAt" TIMESTAMP(3),
    "managerApprovedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftSwapRequest_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints
ALTER TABLE "ShiftSchedulingConfig" ADD CONSTRAINT "ShiftSchedulingConfig_schedulingConfigId_key" UNIQUE ("schedulingConfigId");
ALTER TABLE "ShiftEmployee" ADD CONSTRAINT "ShiftEmployee_configId_email_key" UNIQUE ("configId", "email");

-- Add foreign key constraints
ALTER TABLE "ShiftSchedulingConfig" ADD CONSTRAINT "ShiftSchedulingConfig_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShiftSchedulingConfig" ADD CONSTRAINT "ShiftSchedulingConfig_schedulingConfigId_fkey" FOREIGN KEY ("schedulingConfigId") REFERENCES "SchedulingConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ShiftRole" ADD CONSTRAINT "ShiftRole_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ShiftSchedulingConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShiftLocation" ADD CONSTRAINT "ShiftLocation_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ShiftSchedulingConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShiftEmployee" ADD CONSTRAINT "ShiftEmployee_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ShiftSchedulingConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShiftEmployee" ADD CONSTRAINT "ShiftEmployee_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ShiftRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShiftEmployee" ADD CONSTRAINT "ShiftEmployee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ShiftSchedule" ADD CONSTRAINT "ShiftSchedule_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ShiftSchedulingConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Shift" ADD CONSTRAINT "Shift_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ShiftSchedulingConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ShiftSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ShiftEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ShiftRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ShiftLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmployeeAvailability" ADD CONSTRAINT "EmployeeAvailability_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ShiftEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ShiftEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "ShiftEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShiftSwapRequest" ADD CONSTRAINT "ShiftSwapRequest_targetEmployeeId_fkey" FOREIGN KEY ("targetEmployeeId") REFERENCES "ShiftEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "ShiftSchedulingConfig_tenantId_idx" ON "ShiftSchedulingConfig"("tenantId");
CREATE INDEX "ShiftSchedulingConfig_accountId_idx" ON "ShiftSchedulingConfig"("accountId");
CREATE INDEX "ShiftSchedulingConfig_schedulingConfigId_idx" ON "ShiftSchedulingConfig"("schedulingConfigId");

CREATE INDEX "ShiftRole_configId_idx" ON "ShiftRole"("configId");
CREATE INDEX "ShiftLocation_configId_idx" ON "ShiftLocation"("configId");

CREATE INDEX "ShiftEmployee_configId_idx" ON "ShiftEmployee"("configId");
CREATE INDEX "ShiftEmployee_roleId_idx" ON "ShiftEmployee"("roleId");

CREATE INDEX "ShiftSchedule_configId_idx" ON "ShiftSchedule"("configId");
CREATE INDEX "ShiftSchedule_startDate_endDate_idx" ON "ShiftSchedule"("startDate", "endDate");

CREATE INDEX "Shift_configId_idx" ON "Shift"("configId");
CREATE INDEX "Shift_scheduleId_idx" ON "Shift"("scheduleId");
CREATE INDEX "Shift_employeeId_idx" ON "Shift"("employeeId");
CREATE INDEX "Shift_startTime_endTime_idx" ON "Shift"("startTime", "endTime");

CREATE INDEX "EmployeeAvailability_employeeId_idx" ON "EmployeeAvailability"("employeeId");
CREATE INDEX "EmployeeAvailability_dayOfWeek_idx" ON "EmployeeAvailability"("dayOfWeek");
CREATE INDEX "EmployeeAvailability_specificDate_idx" ON "EmployeeAvailability"("specificDate");

CREATE INDEX "TimeOffRequest_employeeId_idx" ON "TimeOffRequest"("employeeId");
CREATE INDEX "TimeOffRequest_startDate_endDate_idx" ON "TimeOffRequest"("startDate", "endDate");
CREATE INDEX "TimeOffRequest_status_idx" ON "TimeOffRequest"("status");

CREATE INDEX "ShiftSwapRequest_shiftId_idx" ON "ShiftSwapRequest"("shiftId");
CREATE INDEX "ShiftSwapRequest_requesterId_idx" ON "ShiftSwapRequest"("requesterId");
CREATE INDEX "ShiftSwapRequest_status_idx" ON "ShiftSwapRequest"("status");
