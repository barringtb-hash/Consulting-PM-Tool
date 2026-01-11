-- Add missing index on stripePaymentIntentId for PaymentTransaction
-- This index is important for efficiently looking up transactions when handling
-- Stripe webhook events or checking payment status

CREATE INDEX IF NOT EXISTS "PaymentTransaction_stripePaymentIntentId_idx"
ON "PaymentTransaction"("stripePaymentIntentId");
