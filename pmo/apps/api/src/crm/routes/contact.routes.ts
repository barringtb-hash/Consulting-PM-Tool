/**
 * Contact Routes
 *
 * REST API endpoints for CRMContact management.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import * as contactService from '../services/contact.service';
import { requireAuth } from '../../auth/auth.middleware';
import {
  tenantMiddleware,
  type TenantRequest,
} from '../../tenant/tenant.middleware';

// Helper to check if error is a "not found" error
function isNotFoundError(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  ) {
    return true;
  }
  if (error instanceof Error && error.message === 'Contact not found') {
    return true;
  }
  return false;
}

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth, tenantMiddleware);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createContactSchema = z.object({
  accountId: z.number().int().positive().optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  mobile: z.string().max(50).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  lifecycle: z
    .enum([
      'LEAD',
      'MQL',
      'SQL',
      'OPPORTUNITY',
      'CUSTOMER',
      'EVANGELIST',
      'CHURNED',
    ])
    .optional(),
  leadSource: z
    .enum([
      'WEBSITE',
      'REFERRAL',
      'LINKEDIN',
      'COLD_CALL',
      'EMAIL',
      'EVENT',
      'PARTNER',
      'OTHER',
    ])
    .optional()
    .nullable(),
  isPrimary: z.boolean().optional(),
  doNotContact: z.boolean().optional(),
  linkedinUrl: z.string().url().max(500).optional().nullable(),
  twitterUrl: z.string().max(100).optional().nullable(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional()
    .nullable(),
  ownerId: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

const updateContactSchema = createContactSchema.partial().extend({
  archived: z.boolean().optional(),
  leadScore: z.number().min(0).max(100).optional(),
});

const listContactsSchema = z.object({
  accountId: z.coerce.number().int().positive().optional(),
  lifecycle: z.string().optional(),
  leadSource: z.string().optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  archived: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  search: z.string().optional(),
  tags: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /crm/contacts/stats - Get contact statistics
 */
router.get('/stats', async (req: TenantRequest, res: Response) => {
  try {
    const stats = await contactService.getContactStats();
    res.json({ data: stats });
  } catch (error) {
    console.error('Error fetching contact stats:', error);
    res.status(500).json({ error: 'Failed to fetch contact statistics' });
  }
});

/**
 * GET /crm/contacts - List contacts with filters
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const parsed = listContactsSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: parsed.error.format(),
      });
      return;
    }

    const { page, limit, sortBy, sortOrder, tags, ...filters } = parsed.data;
    const result = await contactService.listContacts(
      {
        ...filters,
        tags: tags ? tags.split(',').map((t) => t.trim()) : undefined,
      },
      { page, limit, sortBy, sortOrder },
    );

    res.json({ data: result });
  } catch (error) {
    console.error('Error listing contacts:', error);
    res.status(500).json({ error: 'Failed to list contacts' });
  }
});

/**
 * GET /crm/contacts/by-account/:accountId - List contacts for a specific account
 */
router.get(
  '/by-account/:accountId',
  async (req: TenantRequest, res: Response) => {
    try {
      const accountId = parseInt(req.params.accountId, 10);
      if (isNaN(accountId)) {
        res.status(400).json({ error: 'Invalid account ID' });
        return;
      }

      const contacts = await contactService.listContactsByAccount(accountId);
      res.json({ data: contacts });
    } catch (error) {
      console.error('Error listing contacts for account:', error);
      res.status(500).json({ error: 'Failed to list contacts' });
    }
  },
);

/**
 * GET /crm/contacts/:id - Get contact by ID
 */
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid contact ID' });
      return;
    }

    const contact = await contactService.getContactById(id);
    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json({ data: contact });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

/**
 * POST /crm/contacts - Create new contact
 */
router.post('/', async (req: TenantRequest, res: Response) => {
  try {
    const parsed = createContactSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid contact data',
        details: parsed.error.format(),
      });
      return;
    }

    // Set owner to current user if not specified
    const input = {
      ...parsed.data,
      ownerId: parsed.data.ownerId ?? req.userId,
    };

    const contact = await contactService.createContact(input);
    res.status(201).json({ data: contact });
  } catch (error) {
    console.error('Error creating contact:', error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      res
        .status(409)
        .json({ error: 'A contact with this email already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

/**
 * PUT /crm/contacts/:id - Update contact
 */
router.put('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid contact ID' });
      return;
    }

    const parsed = updateContactSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid contact data',
        details: parsed.error.format(),
      });
      return;
    }

    const contact = await contactService.updateContact(id, parsed.data);
    res.json({ data: contact });
  } catch (error) {
    if (isNotFoundError(error)) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

/**
 * DELETE /crm/contacts/:id - Archive contact (soft delete)
 */
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid contact ID' });
      return;
    }

    await contactService.deleteContact(id);
    res.status(204).send();
  } catch (error) {
    if (isNotFoundError(error)) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

/**
 * POST /crm/contacts/:id/restore - Restore archived contact
 */
router.post('/:id/restore', async (req: TenantRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid contact ID' });
      return;
    }

    const contact = await contactService.restoreContact(id);
    res.json({ data: contact });
  } catch (error) {
    if (
      isNotFoundError(error) ||
      (error instanceof Error && error.message === 'Archived contact not found')
    ) {
      res.status(404).json({ error: 'Archived contact not found' });
      return;
    }
    console.error('Error restoring contact:', error);
    res.status(500).json({ error: 'Failed to restore contact' });
  }
});

export default router;
