/**
 * Payment Integration Service
 *
 * Handles payment processing via Stripe for appointment bookings.
 * Supports:
 * - Payment intents for secure card processing
 * - Pre-authorization for deposits
 * - Refunds for cancellations
 * - Webhook handling for payment events
 */

import crypto from 'crypto';
import { prisma } from '../../prisma/client';
import { PaymentTiming } from '@prisma/client';

// ============================================================================
// CONFIGURATION
// ============================================================================

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_API_VERSION = '2023-10-16';

// ============================================================================
// TYPES
// ============================================================================

interface StripePaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, string>;
}

interface StripeRefund {
  id: string;
  amount: number;
  status: string;
  payment_intent: string;
}

interface CreatePaymentIntentParams {
  amount: number; // In cents
  currency: string;
  appointmentId: number;
  customerEmail: string;
  customerName: string;
  description: string;
  metadata?: Record<string, string>;
}

interface PaymentConfigDetails {
  id: number;
  configId: number;
  stripeAccountId: string | null;
  stripeOnboarded: boolean;
  currency: string;
  collectPaymentAt: PaymentTiming;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// STRIPE API HELPERS
// ============================================================================

/**
 * Make a request to the Stripe API
 */
async function stripeRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: Record<string, unknown>,
  apiKey?: string,
): Promise<T> {
  const secretKey = apiKey || STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('Stripe API key not configured');
  }

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': STRIPE_API_VERSION,
    },
  };

  if (body && method === 'POST') {
    options.body = new URLSearchParams(
      flattenObject(body) as Record<string, string>,
    ).toString();
  }

  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || `Stripe API error: ${response.status}`,
    );
  }

  return data;
}

/**
 * Flatten nested objects for URL encoding
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}[${key}]` : key;

    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(
        result,
        flattenObject(value as Record<string, unknown>, newKey),
      );
    } else {
      result[newKey] = String(value);
    }
  }

  return result;
}

// ============================================================================
// PAYMENT CONFIGURATION
// ============================================================================

/**
 * Get payment config for a scheduling config
 */
export async function getPaymentConfig(
  configId: number,
): Promise<PaymentConfigDetails | null> {
  try {
    const config = await prisma.paymentConfig.findFirst({
      where: { configId },
    });

    return config;
  } catch (error) {
    // Handle case where table doesn't exist yet (P2021 = table does not exist)
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2021'
    ) {
      console.warn(
        'PaymentConfig table does not exist yet. Run migrations to create it.',
      );
      return null;
    }
    throw error;
  }
}

/**
 * Create or update payment config
 * Note: Stripe keys should be stored in environment variables, not database
 */
export async function upsertPaymentConfig(
  configId: number,
  data: {
    enabled?: boolean; // Maps to stripeOnboarded
    stripeSecretKey?: string; // Ignored - use env var
    stripePublishableKey?: string; // Ignored - use env var
    stripeWebhookSecret?: string; // Ignored - use env var
    paymentTiming?: PaymentTiming; // Maps to collectPaymentAt
    depositPercent?: number; // Ignored - not in schema
    currency?: string;
    refundPolicy?: string; // Ignored - not in schema
  },
): Promise<PaymentConfigDetails | null> {
  try {
    // Map incoming data to actual schema fields
    const schemaData: {
      stripeOnboarded?: boolean;
      collectPaymentAt?: PaymentTiming;
      currency?: string;
    } = {};

    if (data.enabled !== undefined) {
      schemaData.stripeOnboarded = data.enabled;
    }
    if (data.paymentTiming !== undefined) {
      schemaData.collectPaymentAt = data.paymentTiming;
    }
    if (data.currency !== undefined) {
      schemaData.currency = data.currency;
    }

    const existing = await prisma.paymentConfig.findFirst({
      where: { configId },
    });

    if (existing) {
      return prisma.paymentConfig.update({
        where: { id: existing.id },
        data: schemaData,
      });
    }

    return prisma.paymentConfig.create({
      data: {
        configId,
        ...schemaData,
      },
    });
  } catch (error) {
    // Handle case where table doesn't exist yet (P2021 = table does not exist)
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2021'
    ) {
      console.warn(
        'PaymentConfig table does not exist yet. Run migrations to create it.',
      );
      return null;
    }
    throw error;
  }
}

// ============================================================================
// PAYMENT INTENTS
// ============================================================================

/**
 * Create a payment intent for an appointment
 */
export async function createPaymentIntent(
  params: CreatePaymentIntentParams,
  apiKey?: string,
): Promise<{
  clientSecret: string;
  paymentIntentId: string;
  transactionId: number;
}> {
  const paymentIntent = await stripeRequest<StripePaymentIntent>(
    '/payment_intents',
    'POST',
    {
      amount: params.amount,
      currency: params.currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        appointmentId: String(params.appointmentId),
        customerEmail: params.customerEmail,
        customerName: params.customerName,
        ...params.metadata,
      },
      description: params.description,
      receipt_email: params.customerEmail,
    },
    apiKey,
  );

  // Create transaction record
  const transaction = await prisma.paymentTransaction.create({
    data: {
      appointmentId: params.appointmentId,
      stripePaymentIntentId: paymentIntent.id,
      amount: params.amount / 100, // Convert cents to dollars
      currency: params.currency,
      status: 'PENDING',
      type: 'FULL',
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    transactionId: transaction.id,
  };
}

/**
 * Create a deposit payment intent
 */
export async function createDepositPaymentIntent(
  appointmentId: number,
  totalAmount: number,
  depositPercent: number,
  currency: string,
  customerEmail: string,
  customerName: string,
  description: string,
  apiKey?: string,
): Promise<{
  clientSecret: string;
  paymentIntentId: string;
  transactionId: number;
  depositAmount: number;
}> {
  const depositAmount = Math.round(totalAmount * (depositPercent / 100));

  const paymentIntent = await stripeRequest<StripePaymentIntent>(
    '/payment_intents',
    'POST',
    {
      amount: depositAmount,
      currency,
      automatic_payment_methods: { enabled: true },
      capture_method: 'automatic', // Capture immediately
      metadata: {
        appointmentId: String(appointmentId),
        customerEmail,
        customerName,
        paymentType: 'DEPOSIT',
        depositPercent: String(depositPercent),
        totalAmount: String(totalAmount),
      },
      description: `Deposit (${depositPercent}%) - ${description}`,
      receipt_email: customerEmail,
    },
    apiKey,
  );

  // Create transaction record
  const transaction = await prisma.paymentTransaction.create({
    data: {
      appointmentId,
      stripePaymentIntentId: paymentIntent.id,
      amount: depositAmount / 100,
      currency,
      status: 'PENDING',
      type: 'DEPOSIT',
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    transactionId: transaction.id,
    depositAmount: depositAmount / 100,
  };
}

/**
 * Confirm a payment intent was successful
 */
export async function confirmPaymentSuccess(
  paymentIntentId: string,
  apiKey?: string,
): Promise<boolean> {
  const paymentIntent = await stripeRequest<StripePaymentIntent>(
    `/payment_intents/${paymentIntentId}`,
    'GET',
    undefined,
    apiKey,
  );

  const isSuccessful =
    paymentIntent.status === 'succeeded' ||
    paymentIntent.status === 'requires_capture';

  if (isSuccessful) {
    await prisma.paymentTransaction.updateMany({
      where: { stripePaymentIntentId: paymentIntentId },
      data: {
        status: 'SUCCEEDED',
        processedAt: new Date(),
      },
    });
  }

  return isSuccessful;
}

/**
 * Get payment intent status
 */
export async function getPaymentIntentStatus(
  paymentIntentId: string,
  apiKey?: string,
): Promise<string> {
  const paymentIntent = await stripeRequest<StripePaymentIntent>(
    `/payment_intents/${paymentIntentId}`,
    'GET',
    undefined,
    apiKey,
  );

  return paymentIntent.status;
}

// ============================================================================
// REFUNDS
// ============================================================================

/**
 * Process a refund for a cancelled appointment
 */
export async function processRefund(
  appointmentId: number,
  reason?: string,
  apiKey?: string,
): Promise<{
  refundId: string;
  amount: number;
  status: string;
}> {
  // Find the completed transaction
  const transaction = await prisma.paymentTransaction.findFirst({
    where: {
      appointmentId,
      status: 'SUCCEEDED',
    },
  });

  if (!transaction || !transaction.stripePaymentIntentId) {
    throw new Error('No completed payment found for this appointment');
  }

  const refund = await stripeRequest<StripeRefund>(
    '/refunds',
    'POST',
    {
      payment_intent: transaction.stripePaymentIntentId,
      reason: reason || 'requested_by_customer',
    },
    apiKey,
  );

  // Update transaction status
  await prisma.paymentTransaction.update({
    where: { id: transaction.id },
    data: {
      status: 'REFUNDED',
      refundedAt: new Date(),
    },
  });

  return {
    refundId: refund.id,
    amount: refund.amount / 100,
    status: refund.status,
  };
}

/**
 * Process a partial refund
 */
export async function processPartialRefund(
  appointmentId: number,
  refundAmount: number, // In dollars
  reason?: string,
  apiKey?: string,
): Promise<{
  refundId: string;
  amount: number;
  status: string;
}> {
  // Find the completed transaction
  const transaction = await prisma.paymentTransaction.findFirst({
    where: {
      appointmentId,
      status: 'SUCCEEDED',
    },
  });

  if (!transaction || !transaction.stripePaymentIntentId) {
    throw new Error('No completed payment found for this appointment');
  }

  const refund = await stripeRequest<StripeRefund>(
    '/refunds',
    'POST',
    {
      payment_intent: transaction.stripePaymentIntentId,
      amount: Math.round(refundAmount * 100), // Convert to cents
      reason: reason || 'requested_by_customer',
    },
    apiKey,
  );

  // Update transaction with partial refund info
  // Note: Full refund tracking would require schema migration
  await prisma.paymentTransaction.update({
    where: { id: transaction.id },
    data: {
      refundedAt: new Date(),
      status:
        refund.amount / 100 >= Number(transaction.amount)
          ? 'REFUNDED'
          : 'PARTIALLY_REFUNDED',
    },
  });

  return {
    refundId: refund.id,
    amount: refund.amount / 100,
    status: refund.status,
  };
}

// ============================================================================
// WEBHOOK HANDLING
// ============================================================================

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  webhookSecret?: string,
): boolean {
  const secret = webhookSecret || STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('Stripe webhook secret not configured');
    return false;
  }

  try {
    // Extract timestamp and signature from header
    const elements = signature.split(',');
    const timestampElement = elements.find((e) => e.startsWith('t='));
    const signatureElement = elements.find((e) => e.startsWith('v1='));

    if (!timestampElement || !signatureElement) {
      return false;
    }

    const timestamp = timestampElement.split('=')[1];
    const expectedSignature = signatureElement.split('=')[1];

    // Create signed payload
    const signedPayload = `${timestamp}.${payload}`;

    // Compute HMAC
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return computedSignature === expectedSignature;
  } catch {
    return false;
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhookEvent(
  eventType: string,
  eventData: {
    object: {
      id: string;
      status: string;
      metadata?: Record<string, string>;
      amount?: number;
      amount_refunded?: number;
    };
  },
): Promise<void> {
  const paymentIntent = eventData.object;

  switch (eventType) {
    case 'payment_intent.succeeded': {
      await prisma.paymentTransaction.updateMany({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: {
          status: 'SUCCEEDED',
          processedAt: new Date(),
        },
      });
      break;
    }

    case 'payment_intent.payment_failed': {
      await prisma.paymentTransaction.updateMany({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: {
          status: 'FAILED',
        },
      });
      break;
    }

    case 'charge.refunded': {
      // Find transaction and update refund info
      const refundedAmount = paymentIntent.amount_refunded
        ? paymentIntent.amount_refunded / 100
        : 0;
      const originalAmount = paymentIntent.amount
        ? paymentIntent.amount / 100
        : 0;

      await prisma.paymentTransaction.updateMany({
        where: { stripePaymentIntentId: paymentIntent.id },
        data: {
          status:
            refundedAmount >= originalAmount
              ? 'REFUNDED'
              : 'PARTIALLY_REFUNDED',
          refundedAt: new Date(),
        },
      });
      break;
    }
  }
}

// ============================================================================
// APPOINTMENT PAYMENT HELPERS
// ============================================================================

/**
 * Calculate payment amount for an appointment
 */
export async function calculateAppointmentPayment(
  appointmentId: number,
): Promise<{
  totalAmount: number;
  depositAmount: number | null;
  currency: string;
  paymentTiming: PaymentTiming;
} | null> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      appointmentType: { select: { price: true } },
      config: {
        include: {
          paymentConfig: true,
        },
      },
    },
  });

  if (!appointment) {
    return null;
  }

  const paymentConfig = appointment.config.paymentConfig;
  if (!paymentConfig || paymentConfig.collectPaymentAt === 'NONE') {
    return null;
  }

  const totalAmount = Number(appointment.appointmentType?.price || 0);

  return {
    totalAmount,
    depositAmount: null, // Deposit support would require schema migration
    currency: paymentConfig.currency,
    paymentTiming: paymentConfig.collectPaymentAt,
  };
}

/**
 * Get payment transactions for an appointment
 */
export async function getAppointmentTransactions(appointmentId: number) {
  return prisma.paymentTransaction.findMany({
    where: { appointmentId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Check if appointment is fully paid
 */
export async function isAppointmentPaid(
  appointmentId: number,
): Promise<boolean> {
  const transactions = await prisma.paymentTransaction.findMany({
    where: {
      appointmentId,
      status: 'SUCCEEDED',
    },
  });

  if (transactions.length === 0) {
    return false;
  }

  const payment = await calculateAppointmentPayment(appointmentId);
  if (!payment) {
    return true; // No payment required
  }

  const totalPaid = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  // For full payment, entire amount must be paid
  return totalPaid >= payment.totalAmount;
}
