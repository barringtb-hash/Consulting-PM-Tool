/**
 * Project Documents Nested Routes
 *
 * This router contains ONLY the routes that need to be at /api/projects/:projectId/documents.
 * It's separate from projectDocuments.ts to avoid the /:id route catching all /api/* requests
 * when the main router is mounted at /api.
 */

import { Router } from 'express';

import { AuthenticatedRequest, requireAuth } from '../auth/auth.middleware';
import { tenantMiddleware } from '../tenant/tenant.middleware';
import * as projectDocumentService from '../services/projectDocument.service';
import {
  createProjectDocumentSchema,
  listProjectDocumentsQuerySchema,
} from '../validation/projectDocument.schema';

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

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

export default router;
