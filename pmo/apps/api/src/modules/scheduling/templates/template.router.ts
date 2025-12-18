/**
 * Template Router for AI Scheduling
 *
 * API endpoints for industry templates
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../auth/auth.middleware';
import { templateService, IndustryTemplate } from './template.service';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const applyTemplateSchema = z.object({
  clientId: z.number().int().positive(),
  templateId: z.string(),
  accountId: z.number().int().positive().optional(),
  customizations: z
    .object({
      defaultSlotDurationMin: z.number().optional(),
      bufferMinutes: z.number().optional(),
      minAdvanceBookingHours: z.number().optional(),
      maxAdvanceBookingDays: z.number().optional(),
      allowWalkIns: z.boolean().optional(),
      enableReminders: z.boolean().optional(),
      reminderHoursBefore: z.array(z.number()).optional(),
      requirePhone: z.boolean().optional(),
      autoConfirm: z.boolean().optional(),
    })
    .optional(),
});

const compareTemplateSchema = z.object({
  clientId: z.number().int().positive(),
  templateId: z.string(),
});

// ============================================================================
// PUBLIC ROUTES (No auth required - for booking pages)
// ============================================================================

/**
 * GET /api/scheduling/templates
 * List all available industry templates
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const templates = await templateService.getAllTemplates();

    // Return simplified list for public use
    const simplifiedTemplates = templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      icon: t.icon,
      category: t.category,
      appointmentTypeCount: t.appointmentTypes.length,
      features: extractPublicFeatures(t),
    }));

    res.json({ data: simplifiedTemplates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * GET /api/scheduling/templates/categories
 * List template categories
 */
router.get('/categories', async (_req: Request, res: Response) => {
  const categories = [
    {
      id: 'healthcare',
      name: 'Healthcare & Medical',
      description: 'Medical practices, clinics, and telehealth',
      icon: 'stethoscope',
    },
    {
      id: 'professional',
      name: 'Professional Services',
      description: 'Legal, financial, and consulting services',
      icon: 'briefcase',
    },
    {
      id: 'home_services',
      name: 'Home Services',
      description: 'Plumbing, HVAC, electrical, and repairs',
      icon: 'wrench',
    },
    {
      id: 'beauty',
      name: 'Beauty & Wellness',
      description: 'Salons, spas, and fitness studios',
      icon: 'sparkles',
    },
    {
      id: 'restaurant',
      name: 'Restaurant & Dining',
      description: 'Table reservations and event bookings',
      icon: 'utensils',
    },
  ];

  res.json({ data: categories });
});

/**
 * GET /api/scheduling/templates/:templateId
 * Get a specific template with full details
 */
router.get('/:templateId', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const template = await templateService.getTemplate(templateId);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ data: template });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

/**
 * GET /api/scheduling/templates/:templateId/preview
 * Preview a template before applying
 */
router.get('/:templateId/preview', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const preview = await templateService.previewTemplate(templateId);

    if (!preview) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ data: preview });
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({ error: 'Failed to preview template' });
  }
});

/**
 * GET /api/scheduling/templates/by-category/:category
 * Get templates by category
 */
router.get('/by-category/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const validCategories = [
      'healthcare',
      'professional',
      'home_services',
      'beauty',
      'restaurant',
    ];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const templates = await templateService.getTemplatesByCategory(
      category as IndustryTemplate['category'],
    );

    res.json({ data: templates });
  } catch (error) {
    console.error('Error fetching templates by category:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// ============================================================================
// PROTECTED ROUTES (Auth required)
// ============================================================================

/**
 * POST /api/scheduling/templates/apply
 * Apply a template to create/update scheduling config
 */
router.post('/apply', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = applyTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const { clientId, templateId, accountId, customizations } = parsed.data;
    const tenantId = req.user!.tenantId;

    const result = await templateService.applyTemplate(clientId, templateId, {
      tenantId,
      accountId,
      customizations,
    });

    res.json({ data: result });
  } catch (error) {
    console.error('Error applying template:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to apply template' });
  }
});

/**
 * POST /api/scheduling/templates/reset
 * Reset config to template defaults
 */
router.post('/reset', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = compareTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const { clientId, templateId } = parsed.data;

    const result = await templateService.resetToTemplateDefaults(
      clientId,
      templateId,
    );

    res.json({ data: result });
  } catch (error) {
    console.error('Error resetting to template:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to reset to template' });
  }
});

/**
 * POST /api/scheduling/templates/compare
 * Compare current config with template defaults
 */
router.post('/compare', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = compareTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const { clientId, templateId } = parsed.data;

    const result = await templateService.compareWithTemplate(
      clientId,
      templateId,
    );

    res.json({ data: result });
  } catch (error) {
    console.error('Error comparing with template:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to compare with template' });
  }
});

/**
 * GET /api/scheduling/templates/applied/:clientId
 * Get the template currently applied to a client's config
 */
router.get(
  '/applied/:clientId',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId, 10);
      if (isNaN(clientId)) {
        return res.status(400).json({ error: 'Invalid client ID' });
      }

      const template = await templateService.getAppliedTemplate(clientId);

      res.json({ data: template });
    } catch (error) {
      console.error('Error fetching applied template:', error);
      res.status(500).json({ error: 'Failed to fetch applied template' });
    }
  },
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractPublicFeatures(template: IndustryTemplate): string[] {
  const features: string[] = [];

  if (template.schedulingConfig.allowWalkIns) features.push('Walk-ins');
  if (template.schedulingConfig.enableReminders) features.push('Reminders');
  if (template.schedulingConfig.autoConfirm) features.push('Auto-confirm');
  if (template.bookingPageConfig.showProviderSelection)
    features.push('Provider selection');
  if (template.appointmentTypes.some((a) => a.requiresDeposit))
    features.push('Deposits');

  return features;
}

export default router;
