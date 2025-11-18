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
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  const parsed = clientCreateSchema.safeParse(req.body);

  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid client data', details: parsed.error.format() });
    return;
  }

  const client = await createClient(parsed.data);
  res.status(201).json({ client });
});

router.put('/:id', async (req: AuthenticatedRequest, res) => {
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
});

router.patch('/:id/archive', async (req: AuthenticatedRequest, res) => {
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
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
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
});

export default router;
