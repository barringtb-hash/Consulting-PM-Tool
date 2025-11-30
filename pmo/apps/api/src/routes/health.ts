import { Router } from 'express';
import { prisma } from '../prisma/client';

const router = Router();

router.get('/healthz', async (_req, res) => {
  try {
    // Verify database connectivity with a simple query
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Health check failed - database connection error:', error);
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: 'Database connection failed',
    });
  }
});

export default router;
