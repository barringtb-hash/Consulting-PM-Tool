-- Create RiskLikelihood enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "RiskLikelihood" AS ENUM ('RARE', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'ALMOST_CERTAIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add likelihood and confidence columns to ProjectRisk
ALTER TABLE "ProjectRisk" ADD COLUMN IF NOT EXISTS "likelihood" "RiskLikelihood" NOT NULL DEFAULT 'POSSIBLE';
ALTER TABLE "ProjectRisk" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION;
