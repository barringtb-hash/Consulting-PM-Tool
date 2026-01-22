/**
 * Public Contracts Routes
 *
 * Public API endpoints for contract viewing and signing.
 * No authentication required - access controlled by tokens.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { contractSigningService } from './services/contract-signing.service';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const signContractSchema = z.object({
  signatureData: z.object({
    type: z.enum(['TYPED_NAME', 'DRAWN', 'UPLOAD']),
    typedName: z.string().min(2).max(200).optional(),
    drawnSignature: z.string().optional(), // Base64 encoded
    uploadedSignature: z.string().optional(),
  }),
});

const declineContractSchema = z.object({
  reason: z.string().max(1000).optional(),
});

const verifyPasswordSchema = z.object({
  password: z.string().min(1),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/public/contracts/:shareToken
 * View a contract by share token
 */
router.get('/contracts/:shareToken', async (req: Request, res: Response) => {
  const shareToken = String(req.params.shareToken);

  // Check if password is required
  const requiresPassword =
    await contractSigningService.requiresPassword(shareToken);

  if (requiresPassword) {
    return res.status(401).json({
      error: 'Password required',
      requiresPassword: true,
    });
  }

  const contract = await contractSigningService.getContractByShareToken(
    shareToken,
    getClientIp(req),
    getUserAgent(req),
  );

  if (!contract) {
    return res.status(404).json({ error: 'Contract not found or expired' });
  }

  res.json({ data: contract });
});

/**
 * POST /api/public/contracts/:shareToken/verify
 * Verify password for a password-protected contract
 */
router.post(
  '/contracts/:shareToken/verify',
  async (req: Request, res: Response) => {
    const shareToken = String(req.params.shareToken);

    const parsed = verifyPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const isValid = await contractSigningService.verifySharePassword(
      shareToken,
      parsed.data.password,
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Get the contract after password verification
    const contract = await contractSigningService.getContractByShareToken(
      shareToken,
      getClientIp(req),
      getUserAgent(req),
    );

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found or expired' });
    }

    res.json({ data: contract });
  },
);

/**
 * GET /api/public/contracts/sign/:signToken
 * View a contract for signing
 */
router.get(
  '/contracts/sign/:signToken',
  async (req: Request, res: Response) => {
    const signToken = String(req.params.signToken);

    const result = await contractSigningService.getContractBySignToken(
      signToken,
      getClientIp(req),
      getUserAgent(req),
    );

    if (!result) {
      return res
        .status(404)
        .json({ error: 'Signature link not found or expired' });
    }

    res.json({ data: result });
  },
);

/**
 * POST /api/public/contracts/sign/:signToken
 * Sign a contract
 */
router.post(
  '/contracts/sign/:signToken',
  async (req: Request, res: Response) => {
    const signToken = String(req.params.signToken);

    const parsed = signContractSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    // Validate signature data based on type
    const { signatureData } = parsed.data;
    if (signatureData.type === 'TYPED_NAME' && !signatureData.typedName) {
      return res.status(400).json({ error: 'Typed name is required' });
    }
    if (signatureData.type === 'DRAWN' && !signatureData.drawnSignature) {
      return res.status(400).json({ error: 'Drawn signature is required' });
    }

    const result = await contractSigningService.signContract({
      signToken,
      signatureData: {
        ...signatureData,
        timestamp: new Date(),
      },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ data: result });
  },
);

/**
 * POST /api/public/contracts/sign/:signToken/decline
 * Decline to sign a contract
 */
router.post(
  '/contracts/sign/:signToken/decline',
  async (req: Request, res: Response) => {
    const signToken = String(req.params.signToken);

    const parsed = declineContractSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const result = await contractSigningService.declineContract({
      signToken,
      reason: parsed.data.reason,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ data: result });
  },
);

export default router;
