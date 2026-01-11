import { Router, Request, Response } from 'express';
import { createRateLimiter } from '../middleware/rate-limit.middleware';
import { publicLeadCreateSchema } from '../validation/lead.schema';
import { createPublicLead } from '../services/lead.service';
import prisma from '../prisma/client';

const router = Router();

// Rate limit: 5 submissions per 15 minutes per IP
const submitLeadRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many lead submissions. Please try again in 15 minutes.',
});

/**
 * POST /api/public/inbound-leads
 * Public endpoint for website lead capture
 *
 * This endpoint is intentionally unauthenticated to allow website forms to submit leads
 * Rate limiting is applied to prevent spam
 *
 * Requires tenantSlug to associate leads with the correct tenant
 */
router.post(
  '/inbound-leads',
  submitLeadRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate and sanitize input
      const parsed = publicLeadCreateSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid lead data',
          details: parsed.error.format(),
        });
        return;
      }

      const { tenantSlug, ...leadData } = parsed.data;

      // Look up tenant by slug or by ID in a single query
      // This allows users to use either their human-readable slug or tenant ID
      const tenant = await prisma.tenant.findFirst({
        where: {
          OR: [{ slug: tenantSlug }, { id: tenantSlug }],
        },
        select: { id: true, status: true },
      });

      if (!tenant) {
        res.status(400).json({
          error: 'Tenant not found',
        });
        return;
      }

      if (tenant.status !== 'ACTIVE') {
        res.status(400).json({
          error: 'Tenant is not active',
        });
        return;
      }

      // Create the lead with tenant association
      const lead = await createPublicLead(leadData, tenant.id);

      // TODO: Send email notification to admin/sales team
      // This could use a service like SendGrid, AWS SES, or Resend
      // Example: await sendLeadNotification(lead);

      // TODO: Create default follow-up task when lead is assigned to an owner
      // This will require additional logic to:
      // 1. Determine the default owner (or leave unassigned for triage)
      // 2. Create a task with due date (e.g., "Reply to Ada" due in 24 hours)
      // Note: Task creation requires a project context, so this may be better
      // handled when the lead is qualified and converted to a project

      res.status(201).json({
        success: true,
        leadId: String(lead.id),
      });
    } catch (error) {
      console.error('Failed to create public lead:', error);
      res.status(500).json({
        error: 'Failed to submit your information. Please try again later.',
      });
    }
  },
);

export default router;
