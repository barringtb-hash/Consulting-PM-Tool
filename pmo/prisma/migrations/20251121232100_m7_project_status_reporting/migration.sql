-- CreateEnum
CREATE TYPE "ProjectHealthStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'OFF_TRACK');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "healthStatus" "ProjectHealthStatus" NOT NULL DEFAULT 'ON_TRACK',
ADD COLUMN     "statusSummary" TEXT,
ADD COLUMN     "statusUpdatedAt" TIMESTAMP(3);
