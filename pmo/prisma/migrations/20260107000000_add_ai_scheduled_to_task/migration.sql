-- AlterTable: Add AI Projects module columns to Task
ALTER TABLE "Task" ADD COLUMN "estimatedHours" DOUBLE PRECISION;
ALTER TABLE "Task" ADD COLUMN "actualHours" DOUBLE PRECISION;
ALTER TABLE "Task" ADD COLUMN "aiEstimatedHours" DOUBLE PRECISION;
ALTER TABLE "Task" ADD COLUMN "aiEstimateAccepted" BOOLEAN;
ALTER TABLE "Task" ADD COLUMN "scheduledStartDate" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "scheduledEndDate" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "aiScheduled" BOOLEAN NOT NULL DEFAULT false;
