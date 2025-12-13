import { Prisma } from '@prisma/client';
import { NextFunction, Router } from 'express';

import { requireAuth } from '../auth/auth.middleware';
import {
  tenantMiddleware,
  type TenantRequest,
} from '../tenant/tenant.middleware';
import {
  archiveContact,
  createContact,
  deleteContact,
  listContacts,
  updateContact,
} from '../services/contact.service';
import prisma from '../prisma/client';
import {
  contactCreateSchema,
  contactUpdateSchema,
} from '../validation/contact.schema';

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

router.get('/', async (req: TenantRequest, res) => {
  const { search, clientId, archived } = req.query;
  const parsedClientId =
    typeof clientId === 'string' && clientId.length > 0
      ? Number(clientId)
      : undefined;

  if (parsedClientId !== undefined && Number.isNaN(parsedClientId)) {
    res.status(400).json({ error: 'Invalid client id' });
    return;
  }

  const includeArchived = archived === 'true';

  const contacts = await listContacts({
    search: typeof search === 'string' ? search : undefined,
    clientId: parsedClientId,
    includeArchived,
  });

  res.json({ contacts });
});

router.post('/', async (req: TenantRequest, res, next: NextFunction) => {
  const parsed = contactCreateSchema.safeParse(req.body);

  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid contact data', details: parsed.error.format() });
    return;
  }

  const client = await prisma.client.findUnique({
    where: { id: parsed.data.clientId },
  });

  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }

  try {
    const contact = await createContact(parsed.data);
    res.status(201).json({ contact });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      res.status(409).json({
        error: 'A contact with this email already exists for the client',
      });
      return;
    }

    next(error);
  }
});

router.put('/:id', async (req: TenantRequest, res, next: NextFunction) => {
  const contactId = Number(req.params.id);

  if (Number.isNaN(contactId)) {
    res.status(400).json({ error: 'Invalid contact id' });
    return;
  }

  const parsed = contactUpdateSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid contact data',
      details: parsed.error.format(),
    });
    return;
  }

  if (parsed.data.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: parsed.data.clientId },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
  }

  try {
    const updated = await updateContact(contactId, parsed.data);

    if (!updated) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json({ contact: updated });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      res.status(409).json({
        error: 'A contact with this email already exists for the client',
      });
      return;
    }

    next(error);
  }
});

router.patch('/:id/archive', async (req: TenantRequest, res) => {
  const contactId = Number(req.params.id);

  if (Number.isNaN(contactId)) {
    res.status(400).json({ error: 'Invalid contact id' });
    return;
  }

  const archivedContact = await archiveContact(contactId);

  if (!archivedContact) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }

  res.json({ contact: archivedContact });
});

router.delete('/:id', async (req: TenantRequest, res) => {
  const contactId = Number(req.params.id);

  if (Number.isNaN(contactId)) {
    res.status(400).json({ error: 'Invalid contact id' });
    return;
  }

  const deleted = await deleteContact(contactId);

  if (!deleted) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }

  res.status(204).send();
});

export default router;
