import { AiMaturity, CompanySize } from '@prisma/client';
import { Router } from 'express';

import { requireAuth } from '../auth/auth.middleware';
import {
  tenantMiddleware,
  type TenantRequest,
} from '../tenant/tenant.middleware';
import {
  archiveClient,
  createClient,
  deleteClient,
  listClients,
  updateClient,
} from '../services/client.service';
import {
  clientCreateSchema,
  clientUpdateSchema,
} from '../validation/client.schema';
import { createChildLogger } from '../utils/logger';

const log = createChildLogger({ module: 'clients' });
const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

router.get('/', async (req: TenantRequest, res) => {
  try {
    const { search, companySize, aiMaturity, archived, page, limit } =
      req.query;

    const parsedCompanySize =
      typeof companySize === 'string' &&
      Object.values(CompanySize).includes(companySize as CompanySize)
        ? (companySize as CompanySize)
        : undefined;

    const parsedAiMaturity =
      typeof aiMaturity === 'string' &&
      Object.values(AiMaturity).includes(aiMaturity as AiMaturity)
        ? (aiMaturity as AiMaturity)
        : undefined;

    if (
      (companySize && !parsedCompanySize) ||
      (aiMaturity && !parsedAiMaturity)
    ) {
      res.status(400).json({ error: 'Invalid filter value' });
      return;
    }

    // Parse pagination parameters
    const parsedPage =
      typeof page === 'string' ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const parsedLimit =
      typeof limit === 'string' ? parseInt(limit, 10) || 50 : 50;

    const includeArchived = archived === 'true';

    const result = await listClients({
      search: typeof search === 'string' ? search : undefined,
      companySize: parsedCompanySize,
      aiMaturity: parsedAiMaturity,
      includeArchived,
      page: parsedPage,
      limit: parsedLimit,
    });

    res.json({
      clients: result.data,
      meta: result.meta,
    });
  } catch (error) {
    log.error('List clients error', error);
    res.status(500).json({ error: 'Failed to list clients' });
  }
});

router.post('/', async (req: TenantRequest, res) => {
  try {
    const parsed = clientCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid client data', details: parsed.error.format() });
      return;
    }

    const client = await createClient(parsed.data);
    res.status(201).json({ client });
  } catch (error) {
    log.error('Create client error', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

router.put('/:id', async (req: TenantRequest, res) => {
  try {
    const clientId = Number(req.params.id);

    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client id' });
      return;
    }

    const parsed = clientUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid client data', details: parsed.error.format() });
      return;
    }

    const updated = await updateClient(clientId, parsed.data);

    if (!updated) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    res.json({ client: updated });
  } catch (error) {
    log.error('Update client error', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

router.patch('/:id/archive', async (req: TenantRequest, res) => {
  try {
    const clientId = Number(req.params.id);

    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client id' });
      return;
    }

    const archivedClient = await archiveClient(clientId);

    if (!archivedClient) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    res.json({ client: archivedClient });
  } catch (error) {
    log.error('Archive client error', error);
    res.status(500).json({ error: 'Failed to archive client' });
  }
});

router.delete('/:id', async (req: TenantRequest, res) => {
  try {
    const clientId = Number(req.params.id);

    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client id' });
      return;
    }

    const archivedClient = await deleteClient(clientId);

    if (!archivedClient) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    log.error('Delete client error', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

export default router;
