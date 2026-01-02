/**
 * Project Documents API Routes
 * Routes for project document template operations
 */

import { Router } from 'express';
import { ProjectDocumentType } from '@prisma/client';

import { AuthenticatedRequest, requireAuth } from '../auth/auth.middleware';
import { tenantMiddleware } from '../tenant/tenant.middleware';
import * as projectDocumentService from '../services/projectDocument.service';
import {
  createProjectDocumentSchema,
  updateProjectDocumentSchema,
  updateDocumentStatusSchema,
  listProjectDocumentsQuerySchema,
  cloneProjectDocumentSchema,
  restoreVersionSchema,
} from '../validation/projectDocument.schema';

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

// ============================================================================
// Template Routes
// ============================================================================

/**
 * GET /api/project-documents/templates
 * Get all available document templates
 */
router.get('/templates', async (_req: AuthenticatedRequest, res) => {
  try {
    const templates = projectDocumentService.getAvailableTemplates();
    res.json({ templates });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

/**
 * GET /api/project-documents/templates/:type
 * Get a specific template by type
 */
router.get('/templates/:type', async (req: AuthenticatedRequest, res) => {
  try {
    const type = req.params.type as ProjectDocumentType;

    if (!Object.values(ProjectDocumentType).includes(type)) {
      res.status(400).json({ error: 'Invalid template type' });
      return;
    }

    const template = projectDocumentService.getTemplateInfo(type);
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json({ template });
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// ============================================================================
// Project Document Routes
// ============================================================================

/**
 * GET /api/projects/:projectId/documents
 * List all documents for a project
 */
router.get(
  '/projects/:projectId/documents',
  async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);

      if (isNaN(projectId)) {
        res.status(400).json({ error: 'Invalid project ID' });
        return;
      }

      const queryResult = listProjectDocumentsQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        res.status(400).json({ errors: queryResult.error.flatten() });
        return;
      }

      const documents = await projectDocumentService.listProjectDocuments({
        projectId,
        ...queryResult.data,
      });

      res.json({ documents });
    } catch (error) {
      console.error('Error listing documents:', error);
      res.status(500).json({ error: 'Failed to list documents' });
    }
  },
);

/**
 * GET /api/projects/:projectId/documents/stats
 * Get document statistics for a project
 */
router.get(
  '/projects/:projectId/documents/stats',
  async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);

      if (isNaN(projectId)) {
        res.status(400).json({ error: 'Invalid project ID' });
        return;
      }

      const stats =
        await projectDocumentService.getProjectDocumentStats(projectId);
      res.json({ stats });
    } catch (error) {
      console.error('Error getting document stats:', error);
      res.status(500).json({ error: 'Failed to get document statistics' });
    }
  },
);

/**
 * POST /api/projects/:projectId/documents
 * Create a new document from a template
 */
router.post(
  '/projects/:projectId/documents',
  async (req: AuthenticatedRequest, res) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);

      if (isNaN(projectId)) {
        res.status(400).json({ error: 'Invalid project ID' });
        return;
      }

      const bodyResult = createProjectDocumentSchema.safeParse(req.body);
      if (!bodyResult.success) {
        res.status(400).json({ errors: bodyResult.error.flatten() });
        return;
      }

      const userId = req.userId!;
      const document = await projectDocumentService.createProjectDocument(
        userId,
        {
          projectId,
          ...bodyResult.data,
        },
      );

      res.status(201).json({ document });
    } catch (error) {
      console.error('Error creating document:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to create document';

      if (message === 'Project not found') {
        res.status(404).json({ error: message });
      } else if (message === 'Access denied') {
        res.status(403).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  },
);

/**
 * GET /api/project-documents/:id
 * Get a single document by ID
 */
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }

    const document = await projectDocumentService.getProjectDocumentById(id);

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json({ document });
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

/**
 * PUT /api/project-documents/:id
 * Update a document
 */
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }

    const bodyResult = updateProjectDocumentSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ errors: bodyResult.error.flatten() });
      return;
    }

    const userId = req.userId!;
    const document = await projectDocumentService.updateProjectDocument(
      id,
      userId,
      bodyResult.data,
    );

    res.json({ document });
  } catch (error) {
    console.error('Error updating document:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to update document';

    if (message === 'Document not found') {
      res.status(404).json({ error: message });
    } else if (message === 'Access denied') {
      res.status(403).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * PATCH /api/project-documents/:id/status
 * Update document status only
 */
router.patch('/:id/status', async (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }

    const bodyResult = updateDocumentStatusSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ errors: bodyResult.error.flatten() });
      return;
    }

    const userId = req.userId!;
    const document = await projectDocumentService.updateDocumentStatus(
      id,
      userId,
      bodyResult.data.status,
    );

    res.json({ document });
  } catch (error) {
    console.error('Error updating document status:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to update status';

    if (message === 'Document not found') {
      res.status(404).json({ error: message });
    } else if (message === 'Access denied') {
      res.status(403).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * POST /api/project-documents/:id/clone
 * Clone a document
 */
router.post('/:id/clone', async (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }

    const bodyResult = cloneProjectDocumentSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ errors: bodyResult.error.flatten() });
      return;
    }

    const userId = req.userId!;
    const document = await projectDocumentService.cloneProjectDocument(
      id,
      userId,
      bodyResult.data.newName,
    );

    res.status(201).json({ document });
  } catch (error) {
    console.error('Error cloning document:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to clone document';

    if (message === 'Document not found') {
      res.status(404).json({ error: message });
    } else if (message === 'Access denied') {
      res.status(403).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * DELETE /api/project-documents/:id
 * Delete a document
 */
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }

    const userId = req.userId!;
    await projectDocumentService.deleteProjectDocument(id, userId);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting document:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to delete document';

    if (message === 'Document not found') {
      res.status(404).json({ error: message });
    } else if (message === 'Access denied') {
      res.status(403).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// ============================================================================
// Version Routes
// ============================================================================

/**
 * GET /api/project-documents/:id/versions
 * Get version history for a document
 */
router.get('/:id/versions', async (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }

    const versions = await projectDocumentService.getDocumentVersionHistory(id);
    res.json({ versions });
  } catch (error) {
    console.error('Error getting version history:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to get versions';

    if (message === 'Document not found') {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * GET /api/project-documents/:id/versions/:version
 * Get a specific version of a document
 */
router.get('/:id/versions/:version', async (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const version = parseInt(req.params.version, 10);

    if (isNaN(id) || isNaN(version)) {
      res.status(400).json({ error: 'Invalid document ID or version' });
      return;
    }

    const versionRecord = await projectDocumentService.getDocumentVersion(
      id,
      version,
    );

    if (!versionRecord) {
      res.status(404).json({ error: 'Version not found' });
      return;
    }

    res.json({ version: versionRecord });
  } catch (error) {
    console.error('Error getting version:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to get version';

    if (message === 'Document not found') {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * POST /api/project-documents/:id/versions/restore
 * Restore a document to a previous version
 */
router.post('/:id/versions/restore', async (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }

    const bodyResult = restoreVersionSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ errors: bodyResult.error.flatten() });
      return;
    }

    const userId = req.userId!;
    const document = await projectDocumentService.restoreDocumentVersion(
      id,
      bodyResult.data.version,
      userId,
    );

    res.json({ document });
  } catch (error) {
    console.error('Error restoring version:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to restore version';

    if (message === 'Document not found' || message === 'Version not found') {
      res.status(404).json({ error: message });
    } else if (message === 'Access denied') {
      res.status(403).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

export default router;
