-- Add schedulingConfigId to ShiftSchedulingConfig
-- This allows the shift scheduling module to be linked to the appointment scheduling config
-- so the frontend can use the same config ID for both scheduling types

-- Add the foreign key column
ALTER TABLE "ShiftSchedulingConfig" ADD COLUMN "schedulingConfigId" INTEGER;

-- Create unique constraint
ALTER TABLE "ShiftSchedulingConfig" ADD CONSTRAINT "ShiftSchedulingConfig_schedulingConfigId_key" UNIQUE ("schedulingConfigId");

-- Add foreign key constraint
ALTER TABLE "ShiftSchedulingConfig" ADD CONSTRAINT "ShiftSchedulingConfig_schedulingConfigId_fkey" FOREIGN KEY ("schedulingConfigId") REFERENCES "SchedulingConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for faster lookups
CREATE INDEX "ShiftSchedulingConfig_schedulingConfigId_idx" ON "ShiftSchedulingConfig"("schedulingConfigId");
