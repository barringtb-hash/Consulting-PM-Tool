import { LeadSource, LeadStatus } from '@prisma/client';
import { Router } from 'express';

import { AuthenticatedRequest, requireAuth } from '../auth/auth.middleware';
import {
  convertLead,
  createLead,
  deleteLead,
  getLeadById,
  listLeads,
  updateLead,
} from '../services/lead.service';
import {
  leadConvertSchema,
  leadCreateSchema,
  leadUpdateSchema,
} from '../validation/lead.schema';

const router = Router();

router.use(requireAuth);

// List all leads
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { search, source, status, ownerUserId } = req.query;

    const parsedSource =
      typeof source === 'string' &&
      Object.values(LeadSource).includes(source as LeadSource)
        ? (source as LeadSource)
        : undefined;

    const parsedStatus =
      typeof status === 'string' &&
      Object.values(LeadStatus).includes(status as LeadStatus)
        ? (status as LeadStatus)
        : undefined;

    const parsedOwnerId =
      typeof ownerUserId === 'string' ? Number(ownerUserId) : undefined;

    if (
      (source && !parsedSource) ||
      (status && !parsedStatus) ||
      (ownerUserId && Number.isNaN(parsedOwnerId))
    ) {
      res.status(400).json({ error: 'Invalid filter value' });
      return;
    }

    const leads = await listLeads({
      search: typeof search === 'string' ? search : undefined,
      source: parsedSource,
      status: parsedStatus,
      ownerUserId: parsedOwnerId,
    });

    res.json({ leads });
  } catch (error) {
    console.error('List leads error:', error);
    res.status(500).json({ error: 'Failed to list leads' });
  }
});

// Get single lead
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const leadId = Number(req.params.id);

    if (Number.isNaN(leadId)) {
      res.status(400).json({ error: 'Invalid lead id' });
      return;
    }

    const lead = await getLeadById(leadId);

    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    res.json({ lead });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Failed to get lead' });
  }
});

// Create new lead
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = leadCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid lead data', details: parsed.error.format() });
      return;
    }

    const lead = await createLead(parsed.data);
    res.status(201).json({ lead });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Update lead
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const leadId = Number(req.params.id);

    if (Number.isNaN(leadId)) {
      res.status(400).json({ error: 'Invalid lead id' });
      return;
    }

    const parsed = leadUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid lead data', details: parsed.error.format() });
      return;
    }

    const updated = await updateLead(leadId, parsed.data);

    if (!updated) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    res.json({ lead: updated });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Convert lead to client/contact/project
router.post('/:id/convert', async (req: AuthenticatedRequest, res) => {
  try {
    const leadId = Number(req.params.id);

    if (Number.isNaN(leadId)) {
      res.status(400).json({ error: 'Invalid lead id' });
      return;
    }

    const parsed = leadConvertSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid conversion data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await convertLead(leadId, parsed.data);
    res.json(result);
  } catch (error) {
    console.error('Convert lead error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to convert lead';
    res.status(500).json({ error: errorMessage });
  }
});

// Delete lead
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const leadId = Number(req.params.id);

    if (Number.isNaN(leadId)) {
      res.status(400).json({ error: 'Invalid lead id' });
      return;
    }

    const deleted = await deleteLead(leadId);

    if (!deleted) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

export default router;
