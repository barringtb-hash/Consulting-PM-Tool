-- AlterTable
ALTER TABLE "Meeting"
  ALTER COLUMN "attendees" TYPE JSONB USING to_jsonb("attendees");
