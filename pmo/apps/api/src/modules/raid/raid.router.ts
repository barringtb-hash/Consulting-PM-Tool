/**
 * RAID Router
 *
 * Combined router that mounts all RAID sub-routers for managing:
 * - Risks (via existing ProjectRisk model)
 * - Action Items
 * - Issues
 * - Decisions
 *
 * Base path: /api/raid
 *
 * Sub-routes:
 * - /action-items/* - Action item management
 * - /decisions/*    - Decision tracking
 * - /issues/*       - Project issue management
 * - /extract/*      - RAID extraction from text
 *
 * @module modules/raid
 */

import { Router } from 'express';

import actionItemsRouter from './action-items.router';
import decisionsRouter from './decisions.router';
import projectIssuesRouter from './project-issues.router';
import risksRouter from './risks.router';
import raidExtractionRouter from './raid-extraction.router';

const router = Router();

/**
 * Mount sub-routers
 *
 * Action Items: /api/raid/action-items
 * - GET    /projects/:projectId/action-items     - List action items
 * - POST   /projects/:projectId/action-items     - Create action item
 * - GET    /:id                                  - Get action item
 * - PUT    /:id                                  - Update action item
 * - DELETE /:id                                  - Delete action item
 * - POST   /:id/convert-to-task                  - Convert to task
 */
router.use('/action-items', actionItemsRouter);

/**
 * Decisions: /api/raid/decisions
 * - GET    /projects/:projectId/decisions   - List decisions
 * - POST   /projects/:projectId/decisions   - Create decision
 * - GET    /:id                             - Get decision
 * - PUT    /:id                             - Update decision
 * - DELETE /:id                             - Delete decision
 * - POST   /:id/supersede                   - Supersede decision
 */
router.use('/decisions', decisionsRouter);

/**
 * Project Issues: /api/raid/issues
 * - GET    /projects/:projectId/issues   - List issues
 * - POST   /projects/:projectId/issues   - Create issue
 * - GET    /:id                          - Get issue
 * - PUT    /:id                          - Update issue
 * - DELETE /:id                          - Delete issue
 * - POST   /:id/escalate                 - Escalate issue
 */
router.use('/issues', projectIssuesRouter);

/**
 * Risks: /api/raid/risks
 * - GET    /projects/:projectId/risks   - List risks
 * - POST   /projects/:projectId/risks   - Create risk
 * - GET    /:id                         - Get risk
 * - PUT    /:id                         - Update risk
 * - DELETE /:id                         - Delete risk
 */
router.use('/risks', risksRouter);

/**
 * RAID Extraction: /api/raid/extract
 * - POST /meetings/:meetingId           - Extract from meeting notes
 * - POST /text                          - Extract from arbitrary text
 * - GET  /projects/:projectId/summary   - Get RAID summary
 * - GET  /projects/:projectId/trends    - Get RAID trends
 */
router.use('/extract', raidExtractionRouter);

export default router;
