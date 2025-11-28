import { Router, Request, Response } from 'express';
import { features } from '../config/env';

const router = Router();

/**
 * GET /api/features
 *
 * Returns the current feature flag configuration.
 * This endpoint is used by the frontend to determine which
 * features should be displayed in the navigation and UI.
 *
 * Note: This endpoint does not require authentication so the
 * frontend can check features before the user logs in.
 */
router.get('/features', (_req: Request, res: Response) => {
  res.json({
    features: {
      marketing: features.marketing,
      sales: features.sales,
      aiAssets: features.aiAssets,
      meetings: features.meetings,
      admin: features.admin,
    },
  });
});

export default router;
