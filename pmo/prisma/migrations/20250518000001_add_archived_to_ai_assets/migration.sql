-- Add archived flag to AI assets for soft deletion
ALTER TABLE "AIAsset" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
