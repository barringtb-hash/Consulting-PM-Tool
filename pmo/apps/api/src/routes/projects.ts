import { ProjectStatus, Prisma } from '@prisma/client';
import { Router, Response } from 'express';
import { ParsedQs } from 'qs';

import { requireAuth } from '../auth/auth.middleware';
import {
  tenantMiddleware,
  type TenantRequest,
} from '../tenant/tenant.middleware';
import prisma from '../prisma/client';
import {
  createProject,
  getProjectById,
  listProjects,
  updateProject,
  deleteProject,
} from '../services/project.service';
import {
  getProjectMembers,
  addProjectMember,
  addProjectMembersBulk,
  updateProjectMemberRole,
  removeProjectMember,
  getTenantUsersForSelection,
} from '../services/projectMember.service';
import {
  projectCreateSchema,
  projectUpdateSchema,
  projectMemberAddSchema,
  projectMemberUpdateSchema,
  projectMemberBulkAddSchema,
} from '../validation/project.schema';
import {
  getProjectStatus,
  buildStatusSummary,
} from '../services/projectStatus.service';
import {
  projectStatusQuerySchema,
  updateProjectHealthStatusSchema,
  statusSummaryRequestSchema,
} from '../validation/projectStatus.schema';
import { createChildLogger } from '../utils/logger';
import { hasProjectAccess, hasAdminAccess } from '../utils/project-access';
import { env } from '../config/env';

const log = createChildLogger({ module: 'projects' });
const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

type ProjectListRequest = TenantRequest & {
  query: ParsedQs;
};

router.get('/', async (req: ProjectListRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { clientId, accountId, status, page, limit } = req.query;
    // Support both clientId (deprecated) and accountId
    const parsedAccountId =
      typeof accountId === 'string' && accountId.length > 0
        ? Number(accountId)
        : typeof clientId === 'string' && clientId.length > 0
          ? Number(clientId)
          : undefined;

    if (parsedAccountId !== undefined && Number.isNaN(parsedAccountId)) {
      res.status(400).json({ error: 'Invalid account id' });
      return;
    }

    const parsedStatus =
      typeof status === 'string' &&
      Object.values(ProjectStatus).includes(status as ProjectStatus)
        ? (status as ProjectStatus)
        : undefined;

    if (status && !parsedStatus) {
      res.status(400).json({ error: 'Invalid project status' });
      return;
    }

    // Parse pagination parameters
    const parsedPage =
      typeof page === 'string' ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const parsedLimit =
      typeof limit === 'string' ? parseInt(limit, 10) || 50 : 50;

    const result = await listProjects({
      ownerId: req.userId,
      accountId: parsedAccountId,
      status: parsedStatus,
      page: parsedPage,
      limit: parsedLimit,
    });

    res.json({
      projects: result.data,
      meta: result.meta,
    });
  } catch (error) {
    const errorInfo = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      // Include stack and Prisma details for server-side logging only
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as { code?: string }).code,
      meta: (error as { meta?: unknown }).meta,
    };
    log.error('List projects error', error, errorInfo);

    // In development, include only non-sensitive error details for debugging
    const isDev = env.nodeEnv === 'development';
    res.status(500).json({
      error: 'Failed to list projects',
      ...(isDev && {
        details: { message: errorInfo.message, name: errorInfo.name },
      }),
    });
  }
});

type ProjectParams = { id: string };

type ProjectRequest = TenantRequest & {
  params: ProjectParams;
};

router.get('/:id', async (req: ProjectRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projectId = Number(req.params.id);

    if (Number.isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project id' });
      return;
    }

    const project = await getProjectById(projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (!hasProjectAccess(project, req.userId)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ project });
  } catch (error) {
    log.error('Get project error', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

router.post('/', async (req: TenantRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = projectCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid project data',
        details: parsed.error.format(),
      });
      return;
    }

    // Verify account exists (support both clientId and accountId)
    const accountId = parsed.data.accountId || parsed.data.clientId;
    if (accountId) {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
    }

    // Build project data based on which fields are provided:
    // - If accountId is explicitly provided: keep both accountId and clientId (if present)
    // - If only clientId is provided: it's being used as the Account ID (frontend workaround),
    //   so use it as accountId and exclude clientId to avoid FK constraint issues
    let projectData;
    if (parsed.data.accountId !== undefined) {
      // accountId is explicitly provided - use as-is, keep clientId if present
      projectData = parsed.data;
    } else if (parsed.data.clientId !== undefined) {
      // Only clientId provided - it contains an Account ID, not a Client ID
      // Exclude clientId and set accountId instead
      const { clientId: _clientId, ...rest } = parsed.data;
      projectData = { ...rest, accountId: parsed.data.clientId };
    } else {
      // Neither provided (validation should catch this, but handle gracefully)
      projectData = parsed.data;
    }

    const project = await createProject(req.userId, projectData);

    res.status(201).json({ project });
  } catch (error) {
    log.error('Create project error', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.put('/:id', async (req: ProjectRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projectId = Number(req.params.id);

    if (Number.isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project id' });
      return;
    }

    const parsed = projectUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid project data',
        details: parsed.error.format(),
      });
      return;
    }

    const project = await getProjectById(projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (!hasProjectAccess(project, req.userId)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Verify account exists if changing (support both clientId and accountId)
    const newAccountId = parsed.data.accountId || parsed.data.clientId;
    if (newAccountId && newAccountId !== project.accountId) {
      const account = await prisma.account.findUnique({
        where: { id: newAccountId },
      });

      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
    }

    // Build update data based on which fields are provided:
    // - If accountId is explicitly provided: keep both, use new accountId
    // - If only clientId is provided: it's being used as the Account ID,
    //   so use it as accountId and exclude clientId
    // - If neither is provided: just pass through other update fields
    let updateData;
    if (parsed.data.accountId !== undefined) {
      // accountId is explicitly provided - use as-is, keep clientId if present
      updateData = parsed.data;
    } else if (parsed.data.clientId !== undefined) {
      // Only clientId provided - it contains an Account ID, not a Client ID
      // Exclude clientId and set accountId instead
      const { clientId: _clientId, ...rest } = parsed.data;
      updateData = { ...rest, accountId: parsed.data.clientId };
    } else {
      // Neither provided - just pass through other fields
      updateData = parsed.data;
    }

    const updated = await updateProject(projectId, updateData);

    res.json({ project: updated });
  } catch (error) {
    log.error('Update project error', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/:id', async (req: ProjectRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projectId = Number(req.params.id);

    if (Number.isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project id' });
      return;
    }

    const project = await getProjectById(projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (!hasProjectAccess(project, req.userId)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await deleteProject(projectId);

    res.status(204).send();
  } catch (error) {
    log.error('Delete project error', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// M7 - Status & Reporting Routes

/**
 * GET /projects/:id/status
 * Get project status snapshot with metrics and aggregated data
 */
router.get('/:id/status', async (req: ProjectRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projectId = Number(req.params.id);

    if (Number.isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project id' });
      return;
    }

    // Validate query params
    const queryParsed = projectStatusQuerySchema.safeParse(req.query);

    if (!queryParsed.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: queryParsed.error.format(),
      });
      return;
    }

    // Check project exists and user has access
    const project = await getProjectById(projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (!hasProjectAccess(project, req.userId)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Get status snapshot
    const snapshot = await getProjectStatus(
      projectId,
      queryParsed.data.rangeDays,
    );

    res.json(snapshot);
  } catch (error) {
    log.error('Get project status error', error);
    res.status(500).json({ error: 'Failed to get project status' });
  }
});

/**
 * PATCH /projects/:id/status
 * Update project health status and summary
 */
router.patch('/:id/status', async (req: ProjectRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projectId = Number(req.params.id);

    if (Number.isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project id' });
      return;
    }

    // Validate body
    const bodyParsed = updateProjectHealthStatusSchema.safeParse(req.body);

    if (!bodyParsed.success) {
      res.status(400).json({
        error: 'Invalid status data',
        details: bodyParsed.error.format(),
      });
      return;
    }

    // Check project exists and user has access
    const project = await getProjectById(projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (!hasProjectAccess(project, req.userId)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Update project status
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        healthStatus: bodyParsed.data.healthStatus,
        statusSummary: bodyParsed.data.statusSummary,
        statusUpdatedAt: new Date(),
      },
    });

    res.json({
      healthStatus: updated.healthStatus,
      statusSummary: updated.statusSummary,
      statusUpdatedAt: updated.statusUpdatedAt,
    });
  } catch (error) {
    log.error('Update project status error', error);
    res.status(500).json({ error: 'Failed to update project status' });
  }
});

/**
 * POST /projects/:id/status-summary
 * Generate a time-boxed status summary for reporting
 */
router.post(
  '/:id/status-summary',
  async (req: ProjectRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = Number(req.params.id);

      if (Number.isNaN(projectId)) {
        res.status(400).json({ error: 'Invalid project id' });
        return;
      }

      // Validate body
      const bodyParsed = statusSummaryRequestSchema.safeParse(req.body);

      if (!bodyParsed.success) {
        res.status(400).json({
          error: 'Invalid summary request',
          details: bodyParsed.error.format(),
        });
        return;
      }

      // Check project exists and user has access
      const project = await getProjectById(projectId);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (!hasProjectAccess(project, req.userId)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      // Build status summary
      const summary = await buildStatusSummary({
        projectId,
        from: bodyParsed.data.from,
        to: bodyParsed.data.to,
        rangeDays: bodyParsed.data.rangeDays,
      });

      res.json(summary);
    } catch (error) {
      log.error('Generate status summary error', error);
      res.status(500).json({ error: 'Failed to generate status summary' });
    }
  },
);

// ===== Project Member Management Routes =====

type ProjectMemberRequest = TenantRequest & {
  params: { id: string; userId?: string };
};

/**
 * GET /projects/tenant-users
 * Get list of tenant users for member selection dropdown
 */
router.get('/tenant-users', async (req: TenantRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const search =
      typeof req.query.search === 'string' ? req.query.search : undefined;
    const users = await getTenantUsersForSelection(search);

    res.json({ users });
  } catch (error) {
    log.error('Get tenant users error', error);
    res.status(500).json({ error: 'Failed to get tenant users' });
  }
});

/**
 * GET /projects/:id/members
 * Get all members of a project
 */
router.get('/:id/members', async (req: ProjectMemberRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projectId = Number(req.params.id);

    if (Number.isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project id' });
      return;
    }

    const project = await getProjectById(projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (!hasProjectAccess(project, req.userId)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const members = await getProjectMembers(projectId);

    res.json({ members });
  } catch (error) {
    log.error('Get project members error', error);
    res.status(500).json({ error: 'Failed to get project members' });
  }
});

/**
 * POST /projects/:id/members
 * Add member(s) to a project. Requires admin access.
 * Supports both single member and bulk add (with members array)
 */
router.post(
  '/:id/members',
  async (req: ProjectMemberRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = Number(req.params.id);

      if (Number.isNaN(projectId)) {
        res.status(400).json({ error: 'Invalid project id' });
        return;
      }

      const project = await getProjectById(projectId);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Only admins can add members
      if (!hasAdminAccess(project, req.userId)) {
        res
          .status(403)
          .json({ error: 'Admin access required to manage members' });
        return;
      }

      // Check if bulk add (has members array) or single add
      const body = req.body as Record<string, unknown>;
      if (body.members && Array.isArray(body.members)) {
        // Bulk add
        const parsed = projectMemberBulkAddSchema.safeParse(req.body);

        if (!parsed.success) {
          res.status(400).json({
            error: 'Invalid member data',
            details: parsed.error.format(),
          });
          return;
        }

        // Verify all users exist and are in the tenant
        const userIds = parsed.data.members.map((m) => m.userId);
        const tenantUsers = await getTenantUsersForSelection();
        const validUserIds = new Set(tenantUsers.map((u) => u.id));
        const invalidUsers = userIds.filter((id) => !validUserIds.has(id));

        if (invalidUsers.length > 0) {
          res.status(400).json({
            error: 'Some users are not valid tenant members',
            invalidUserIds: invalidUsers,
          });
          return;
        }

        // Don't add the owner as a member (they already have admin access)
        const membersToAdd = parsed.data.members.filter(
          (m) => m.userId !== project.ownerId,
        );

        if (membersToAdd.length === 0) {
          res.status(400).json({
            error: 'No valid members to add (owner is already admin)',
          });
          return;
        }

        const addedMembers = await addProjectMembersBulk(
          projectId,
          membersToAdd,
          req.userId,
        );

        res.status(201).json({ members: addedMembers });
      } else {
        // Single add
        const parsed = projectMemberAddSchema.safeParse(req.body);

        if (!parsed.success) {
          res.status(400).json({
            error: 'Invalid member data',
            details: parsed.error.format(),
          });
          return;
        }

        // Don't add the owner as a member
        if (parsed.data.userId === project.ownerId) {
          res.status(400).json({
            error: 'Cannot add owner as member (already has admin access)',
          });
          return;
        }

        // Verify user exists and is in the tenant
        const tenantUsers = await getTenantUsersForSelection();
        const validUser = tenantUsers.find((u) => u.id === parsed.data.userId);

        if (!validUser) {
          res.status(400).json({ error: 'User is not a valid tenant member' });
          return;
        }

        const member = await addProjectMember(
          projectId,
          parsed.data,
          req.userId,
        );

        res.status(201).json({ member });
      }
    } catch (error) {
      // Handle unique constraint violation (member already exists)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        res
          .status(409)
          .json({ error: 'User is already a member of this project' });
        return;
      }
      log.error('Add project member error', error);
      res.status(500).json({ error: 'Failed to add project member' });
    }
  },
);

/**
 * PUT /projects/:id/members/:userId
 * Update a project member's role. Requires admin access.
 */
router.put(
  '/:id/members/:userId',
  async (req: ProjectMemberRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = Number(req.params.id);
      const memberUserId = Number(req.params.userId);

      if (Number.isNaN(projectId) || Number.isNaN(memberUserId)) {
        res.status(400).json({ error: 'Invalid project or user id' });
        return;
      }

      const project = await getProjectById(projectId);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Only admins can update member roles
      if (!hasAdminAccess(project, req.userId)) {
        res
          .status(403)
          .json({ error: 'Admin access required to manage members' });
        return;
      }

      const parsed = projectMemberUpdateSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid role data',
          details: parsed.error.format(),
        });
        return;
      }

      const updated = await updateProjectMemberRole(
        projectId,
        memberUserId,
        parsed.data,
      );

      if (!updated) {
        res.status(404).json({ error: 'Member not found' });
        return;
      }

      res.json({ member: updated });
    } catch (error) {
      log.error('Update project member error', error);
      res.status(500).json({ error: 'Failed to update project member' });
    }
  },
);

/**
 * DELETE /projects/:id/members/:userId
 * Remove a member from a project. Requires admin access.
 */
router.delete(
  '/:id/members/:userId',
  async (req: ProjectMemberRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = Number(req.params.id);
      const memberUserId = Number(req.params.userId);

      if (Number.isNaN(projectId) || Number.isNaN(memberUserId)) {
        res.status(400).json({ error: 'Invalid project or user id' });
        return;
      }

      const project = await getProjectById(projectId);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Only admins can remove members
      if (!hasAdminAccess(project, req.userId)) {
        res
          .status(403)
          .json({ error: 'Admin access required to manage members' });
        return;
      }

      const removed = await removeProjectMember(projectId, memberUserId);

      if (!removed) {
        res.status(404).json({ error: 'Member not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      log.error('Remove project member error', error);
      res.status(500).json({ error: 'Failed to remove project member' });
    }
  },
);

export default router;
