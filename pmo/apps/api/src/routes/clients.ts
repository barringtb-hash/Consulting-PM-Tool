import { AiMaturity, CompanySize } from '@prisma/client';
import { Router } from 'express';

import { AuthenticatedRequest, requireAuth } from '../auth/auth.middleware';
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

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { search, companySize, aiMaturity, archived } = req.query;

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

    const includeArchived = archived === 'true';

    const clients = await listClients({
      search: typeof search === 'string' ? search : undefined,
      companySize: parsedCompanySize,
      aiMaturity: parsedAiMaturity,
      includeArchived,
    });

    res.json({ clients });
  } catch (error) {
    console.error('List clients error:', error);
    res.status(500).json({ error: 'Failed to list clients' });
  }
});

router.post('/', async (req: AuthenticatedRequest, res) => {
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
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res) => {
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
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

router.patch('/:id/archive', async (req: AuthenticatedRequest, res) => {
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
    console.error('Archive client error:', error);
    res.status(500).json({ error: 'Failed to archive client' });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
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
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

export default router;
