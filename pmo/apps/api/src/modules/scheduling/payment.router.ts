/**
 * Payment Router
 *
 * API endpoints for payment processing via Stripe.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import * as paymentService from './payment.service';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createPaymentIntentSchema = z.object({
  appointmentId: z.number().int(),
  amount: z.number().positive(),
  currency: z.string().default('usd'),
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  description: z.string().optional(),
});

const updatePaymentConfigSchema = z.object({
  enabled: z.boolean(),
  stripeSecretKey: z.string().optional(),
  stripePublishableKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
  // PaymentTiming enum: BOOKING (at booking), APPOINTMENT (at appointment), NONE (no payment)
  paymentTiming: z.enum(['BOOKING', 'APPOINTMENT', 'NONE']).optional(),
  depositPercent: z.number().min(0).max(100).optional(),
  currency: z.string().length(3).optional(),
  refundPolicy: z.string().optional(),
});

// ============================================================================
// PAYMENT CONFIG ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/payments/config/:configId
 * Get payment configuration for a scheduling config
 */
router.get(
  '/config/:configId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const configId = parseInt(req.params.configId, 10);

      if (isNaN(configId)) {
        res.status(400).json({ error: 'Invalid config ID' });
        return;
      }

      const config = await paymentService.getPaymentConfig(configId);

      if (!config) {
        res.json({
          data: null,
        });
        return;
      }

      // Return config with actual schema fields
      res.json({
        data: {
          id: config.id,
          configId: config.configId,
          stripeAccountId: config.stripeAccountId,
          stripeOnboarded: config.stripeOnboarded,
          collectPaymentAt: config.collectPaymentAt,
          currency: config.currency,
        },
      });
    } catch (error) {
      console.error('Error getting payment config:', error);
      res.status(500).json({ error: 'Failed to get payment configuration' });
    }
  },
);

/**
 * PUT /api/scheduling/payments/config/:configId
 * Update payment configuration
 */
router.put(
  '/config/:configId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const configId = parseInt(req.params.configId, 10);

      if (isNaN(configId)) {
        res.status(400).json({ error: 'Invalid config ID' });
        return;
      }

      const parsed = updatePaymentConfigSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const config = await paymentService.upsertPaymentConfig(
        configId,
        parsed.data,
      );

      if (!config) {
        res.status(503).json({
          error:
            'Payment configuration is currently unavailable. Please try again later.',
        });
        return;
      }

      res.json({
        data: {
          id: config.id,
          configId: config.configId,
          stripeAccountId: config.stripeAccountId,
          stripeOnboarded: config.stripeOnboarded,
          collectPaymentAt: config.collectPaymentAt,
          currency: config.currency,
        },
      });
    } catch (error) {
      console.error('Error updating payment config:', error);
      res.status(500).json({ error: 'Failed to update payment configuration' });
    }
  },
);

// ============================================================================
// PAYMENT INTENT ENDPOINTS
// ============================================================================

/**
 * POST /api/scheduling/payments/create-intent
 * Create a payment intent for an appointment (authenticated)
 */
router.post(
  '/create-intent',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const parsed = createPaymentIntentSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const { appointmentId, amount, currency, customerEmail, customerName } =
        parsed.data;

      const result = await paymentService.createPaymentIntent({
        appointmentId,
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customerEmail,
        customerName,
        description: parsed.data.description || `Appointment #${appointmentId}`,
      });

      res.json({
        data: {
          clientSecret: result.clientSecret,
          transactionId: result.transactionId,
        },
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
  },
);

/**
 * POST /api/scheduling/payments/public/create-intent
 * Create a payment intent for public booking (no auth required)
 */
router.post(
  '/public/create-intent',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const schema = z.object({
        appointmentId: z.number().int(),
        configId: z.number().int(),
      });

      const parsed = schema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const { appointmentId, configId } = parsed.data;

      // Get payment config - check if stripeOnboarded or has valid config
      const paymentConfig = await paymentService.getPaymentConfig(configId);
      if (!paymentConfig) {
        res.status(400).json({ error: 'Payments not configured' });
        return;
      }

      // Calculate payment amount
      const paymentDetails =
        await paymentService.calculateAppointmentPayment(appointmentId);
      if (!paymentDetails) {
        res.status(400).json({ error: 'Unable to calculate payment' });
        return;
      }

      // Get appointment details for description
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          patientName: true,
          patientEmail: true,
          appointmentType: { select: { name: true } },
        },
      });

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      // Create payment intent for full amount
      // Note: Deposit support would require schema migration to add deposit percent config
      const result = await paymentService.createPaymentIntent({
        appointmentId,
        amount: Math.round(paymentDetails.totalAmount * 100),
        currency: paymentDetails.currency,
        customerEmail: appointment.patientEmail || '',
        customerName: appointment.patientName,
        description: appointment.appointmentType?.name || 'Appointment',
      });

      // Use environment variable for publishable key
      const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';

      res.json({
        data: {
          clientSecret: result.clientSecret,
          publishableKey: stripePublishableKey,
          amount: paymentDetails.totalAmount,
          depositAmount: paymentDetails.depositAmount,
          currency: paymentDetails.currency,
        },
      });
    } catch (error) {
      console.error('Error creating public payment intent:', error);
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
  },
);

/**
 * POST /api/scheduling/payments/confirm/:paymentIntentId
 * Confirm payment was successful
 */
router.post(
  '/confirm/:paymentIntentId',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentIntentId } = req.params;

      const isSuccessful =
        await paymentService.confirmPaymentSuccess(paymentIntentId);

      res.json({
        data: {
          success: isSuccessful,
        },
      });
    } catch (error) {
      console.error('Error confirming payment:', error);
      res.status(500).json({ error: 'Failed to confirm payment' });
    }
  },
);

// ============================================================================
// REFUND ENDPOINTS
// ============================================================================

/**
 * POST /api/scheduling/payments/refund/:appointmentId
 * Process a full refund
 */
router.post(
  '/refund/:appointmentId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const appointmentId = parseInt(req.params.appointmentId, 10);

      if (isNaN(appointmentId)) {
        res.status(400).json({ error: 'Invalid appointment ID' });
        return;
      }

      const body = req.body as { reason?: string };
      const result = await paymentService.processRefund(
        appointmentId,
        body.reason,
      );

      res.json({
        data: {
          refundId: result.refundId,
          amount: result.amount,
          status: result.status,
        },
      });
    } catch (error) {
      console.error('Error processing refund:', error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to process refund',
      });
    }
  },
);

/**
 * POST /api/scheduling/payments/partial-refund/:appointmentId
 * Process a partial refund
 */
router.post(
  '/partial-refund/:appointmentId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const appointmentId = parseInt(req.params.appointmentId, 10);

      if (isNaN(appointmentId)) {
        res.status(400).json({ error: 'Invalid appointment ID' });
        return;
      }

      const schema = z.object({
        amount: z.number().positive(),
        reason: z.string().optional(),
      });

      const parsed = schema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const result = await paymentService.processPartialRefund(
        appointmentId,
        parsed.data.amount,
        parsed.data.reason,
      );

      res.json({
        data: {
          refundId: result.refundId,
          amount: result.amount,
          status: result.status,
        },
      });
    } catch (error) {
      console.error('Error processing partial refund:', error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to process refund',
      });
    }
  },
);

// ============================================================================
// WEBHOOK ENDPOINT
// ============================================================================

/**
 * POST /api/scheduling/payments/webhook
 * Handle Stripe webhook events
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload =
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    // Verify webhook signature
    if (
      signature &&
      !paymentService.verifyWebhookSignature(payload, signature)
    ) {
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    const event =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    await paymentService.handleWebhookEvent(event.type, event.data);

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// ============================================================================
// TRANSACTION ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/payments/transactions/:appointmentId
 * Get payment transactions for an appointment
 */
router.get(
  '/transactions/:appointmentId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const appointmentId = parseInt(req.params.appointmentId, 10);

      if (isNaN(appointmentId)) {
        res.status(400).json({ error: 'Invalid appointment ID' });
        return;
      }

      const transactions =
        await paymentService.getAppointmentTransactions(appointmentId);

      res.json({
        data: transactions,
      });
    } catch (error) {
      console.error('Error getting transactions:', error);
      res.status(500).json({ error: 'Failed to get transactions' });
    }
  },
);

/**
 * GET /api/scheduling/payments/status/:appointmentId
 * Check if appointment is paid
 */
router.get(
  '/status/:appointmentId',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const appointmentId = parseInt(req.params.appointmentId, 10);

      if (isNaN(appointmentId)) {
        res.status(400).json({ error: 'Invalid appointment ID' });
        return;
      }

      const isPaid = await paymentService.isAppointmentPaid(appointmentId);

      res.json({
        data: {
          isPaid,
        },
      });
    } catch (error) {
      console.error('Error checking payment status:', error);
      res.status(500).json({ error: 'Failed to check payment status' });
    }
  },
);

// Need to import prisma for the public route
import { prisma } from '../../prisma/client';

export default router;
