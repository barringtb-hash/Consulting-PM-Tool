-- CreateTable: WebhookConfig for chatbot webhook integrations
CREATE TABLE "WebhookConfig" (
    "id" SERIAL NOT NULL,
    "chatbotConfigId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "retryDelayMs" INTEGER NOT NULL DEFAULT 1000,
    "timeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "lastTriggeredAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WebhookDeliveryLog for tracking webhook delivery attempts
CREATE TABLE "WebhookDeliveryLog" (
    "id" SERIAL NOT NULL,
    "webhookId" INTEGER NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ChannelConfig for multi-channel messaging (Twilio, Slack, etc.)
CREATE TABLE "ChannelConfig" (
    "id" SERIAL NOT NULL,
    "chatbotConfigId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credentials" JSONB NOT NULL,
    "settings" JSONB,
    "identifier" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookConfig_chatbotConfigId_isActive_idx" ON "WebhookConfig"("chatbotConfigId", "isActive");

-- CreateIndex
CREATE INDEX "WebhookDeliveryLog_webhookId_createdAt_idx" ON "WebhookDeliveryLog"("webhookId", "createdAt");

-- CreateIndex
CREATE INDEX "ChannelConfig_chatbotConfigId_isActive_idx" ON "ChannelConfig"("chatbotConfigId", "isActive");

-- CreateIndex: Unique constraint for channel per chatbot
CREATE UNIQUE INDEX "ChannelConfig_chatbotConfigId_channel_key" ON "ChannelConfig"("chatbotConfigId", "channel");

-- AddForeignKey
ALTER TABLE "WebhookConfig" ADD CONSTRAINT "WebhookConfig_chatbotConfigId_fkey" FOREIGN KEY ("chatbotConfigId") REFERENCES "ChatbotConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDeliveryLog" ADD CONSTRAINT "WebhookDeliveryLog_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "WebhookConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelConfig" ADD CONSTRAINT "ChannelConfig_chatbotConfigId_fkey" FOREIGN KEY ("chatbotConfigId") REFERENCES "ChatbotConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
