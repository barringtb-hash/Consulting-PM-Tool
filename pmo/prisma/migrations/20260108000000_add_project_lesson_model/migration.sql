-- CreateEnum
CREATE TYPE "LessonCategory" AS ENUM ('SUCCESS', 'CHALLENGE', 'IMPROVEMENT', 'WARNING');

-- CreateEnum
CREATE TYPE "LessonImpact" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "ProjectLesson" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "category" "LessonCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" "LessonImpact" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectLesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectLesson_projectId_idx" ON "ProjectLesson"("projectId");

-- CreateIndex
CREATE INDEX "ProjectLesson_tenantId_category_idx" ON "ProjectLesson"("tenantId", "category");

-- AddForeignKey
ALTER TABLE "ProjectLesson" ADD CONSTRAINT "ProjectLesson_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLesson" ADD CONSTRAINT "ProjectLesson_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
