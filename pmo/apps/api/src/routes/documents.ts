import { Router } from 'express';

import { AuthenticatedRequest, requireAuth } from '../auth/auth.middleware';
import { tenantMiddleware } from '../tenant/tenant.middleware';
import prisma from '../prisma/client';
import {
  generateDocument,
  listDocuments,
  getDocumentById,
  deleteDocument,
} from '../services/document.service';
import { documentGenerateSchema } from '../validation/document.schema';

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

router.get('/', async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { clientId, projectId } = req.query;

  const parsedClientId =
    typeof clientId === 'string' && clientId.length > 0
      ? Number(clientId)
      : undefined;
  const parsedProjectId =
    typeof projectId === 'string' && projectId.length > 0
      ? Number(projectId)
      : undefined;

  if (
    (parsedClientId !== undefined && Number.isNaN(parsedClientId)) ||
    (parsedProjectId !== undefined && Number.isNaN(parsedProjectId))
  ) {
    res.status(400).json({ error: 'Invalid filter id' });
    return;
  }

  const documents = await listDocuments({
    ownerId: req.userId,
    clientId: parsedClientId,
    projectId: parsedProjectId,
  });

  res.json({ documents });
});

router.post('/generate', async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = documentGenerateSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid document data',
      details: parsed.error.format(),
    });
    return;
  }

  // Validate account exists (clientId maps to accountId)
  const account = await prisma.account.findUnique({
    where: { id: parsed.data.clientId },
  });

  if (!account) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }

  if (parsed.data.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.accountId !== parsed.data.clientId) {
      res.status(400).json({ error: 'Project does not belong to account' });
      return;
    }

    if (project.ownerId !== req.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
  }

  const document = await generateDocument(req.userId, parsed.data);

  res.status(201).json({ document });
});

type DocumentParams = { id: string };

router.delete(
  '/:id',
  async (req: AuthenticatedRequest<DocumentParams>, res) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const documentId = Number(req.params.id);

    if (Number.isNaN(documentId)) {
      res.status(400).json({ error: 'Invalid document id' });
      return;
    }

    const document = await getDocumentById(documentId);

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    if (document.ownerId !== req.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await deleteDocument(documentId);

    res.status(204).send();
  },
);

export default router;
