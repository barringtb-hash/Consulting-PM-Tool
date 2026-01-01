-- AlterTable (idempotent)
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "module" TEXT;

-- AlterTable (idempotent)
ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "module" TEXT;

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "Issue_module_idx" ON "Issue"("module");

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "ErrorLog_module_idx" ON "ErrorLog"("module");
