-- AlterTable: Add widget customization fields to ChatbotConfig
ALTER TABLE "ChatbotConfig" ADD COLUMN "widgetPosition" TEXT NOT NULL DEFAULT 'bottom-right';
ALTER TABLE "ChatbotConfig" ADD COLUMN "widgetPrimaryColor" TEXT NOT NULL DEFAULT '#3B82F6';
ALTER TABLE "ChatbotConfig" ADD COLUMN "widgetTextColor" TEXT NOT NULL DEFAULT '#FFFFFF';
ALTER TABLE "ChatbotConfig" ADD COLUMN "widgetBubbleIcon" TEXT NOT NULL DEFAULT 'chat';
ALTER TABLE "ChatbotConfig" ADD COLUMN "widgetTitle" TEXT;
ALTER TABLE "ChatbotConfig" ADD COLUMN "widgetSubtitle" TEXT;
ALTER TABLE "ChatbotConfig" ADD COLUMN "widgetAvatarUrl" TEXT;
ALTER TABLE "ChatbotConfig" ADD COLUMN "widgetAllowedDomains" TEXT;
ALTER TABLE "ChatbotConfig" ADD COLUMN "widgetCustomCss" TEXT;
