-- AlterTable
ALTER TABLE "Issue" ADD COLUMN "module" TEXT;

-- AlterTable
ALTER TABLE "ErrorLog" ADD COLUMN "module" TEXT;

-- CreateIndex
CREATE INDEX "Issue_module_idx" ON "Issue"("module");

-- CreateIndex
CREATE INDEX "ErrorLog_module_idx" ON "ErrorLog"("module");
