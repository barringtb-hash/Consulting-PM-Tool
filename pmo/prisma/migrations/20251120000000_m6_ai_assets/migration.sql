-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('PROMPT_TEMPLATE', 'WORKFLOW', 'DATASET', 'EVALUATION', 'GUARDRAIL');

-- CreateTable
CREATE TABLE "AIAsset" (
    "id" SERIAL NOT NULL,
    "type" "AssetType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "clientId" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAIAsset" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAIAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIAsset_name_clientId_key" ON "AIAsset"("name", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAIAsset_projectId_assetId_key" ON "ProjectAIAsset"("projectId", "assetId");

-- AddForeignKey
ALTER TABLE "AIAsset" ADD CONSTRAINT "AIAsset_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAsset" ADD CONSTRAINT "AIAsset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAIAsset" ADD CONSTRAINT "ProjectAIAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAIAsset" ADD CONSTRAINT "ProjectAIAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "AIAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
