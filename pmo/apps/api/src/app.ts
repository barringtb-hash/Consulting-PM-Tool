import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';

import authRouter from './auth/auth.routes';
import assetsRouter from './routes/assets';
import clientsRouter from './routes/clients';
import contactsRouter from './routes/contacts';
import documentsRouter from './routes/documents';
import healthRouter from './routes/health';
import leadsRouter from './routes/leads';
import publicLeadsRouter from './routes/public-leads';
import milestonesRouter from './routes/milestone.routes';
import marketingRouter from './modules/marketing/marketing.router';
import meetingRouter from './modules/meetings/meeting.router';
import campaignRouter from './modules/campaigns/campaign.router';
import brandProfileRouter from './modules/brand-profiles/brand-profile.router';
import publishingRouter from './modules/publishing/publishing.router';
import projectsRouter from './routes/projects';
import tasksRouter from './routes/task.routes';
import usersRouter from './routes/users';
import { errorHandler } from './middleware/error.middleware';
import { env } from './config/env';

/**
 * Build CORS origin configuration that supports:
 * 1. Single origin: CORS_ORIGIN=https://example.com
 * 2. Multiple origins: CORS_ORIGIN=https://example.com,https://staging.example.com
 * 3. Vercel preview URLs: Automatically allows *.vercel.app subdomains if any Vercel URL is in the list
 */
function buildCorsOrigin(): cors.CorsOptions['origin'] {
  const corsOrigin = env.corsOrigin;

  // If no CORS_ORIGIN set, allow all origins (development mode)
  if (!corsOrigin) {
    return true;
  }

  // Parse comma-separated origins
  const allowedOrigins = corsOrigin.split(',').map((o) => o.trim());

  // Check if any allowed origin is a Vercel URL to enable preview URL support
  const hasVercelOrigin = allowedOrigins.some((origin) =>
    origin.includes('.vercel.app'),
  );

  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Allow requests with no origin (e.g., mobile apps, curl, Postman)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check exact match against allowed origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // If Vercel is configured, allow all Vercel preview deployment URLs
    // Preview URLs follow pattern: project-hash-username.vercel.app
    if (hasVercelOrigin && origin.endsWith('.vercel.app')) {
      callback(null, true);
      return;
    }

    // Origin not allowed
    callback(new Error('Not allowed by CORS'));
  };
}

export function createApp(): express.Express {
  const app = express();

  // CORS configuration for cross-origin cookie authentication
  // Supports multiple origins and Vercel preview deployments
  app.use(
    cors({
      origin: buildCorsOrigin(),
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', authRouter);
  app.use('/api/public', publicLeadsRouter);
  app.use('/api', assetsRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/contacts', contactsRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/leads', leadsRouter);
  app.use('/api', marketingRouter);
  app.use('/api', campaignRouter);
  app.use('/api', brandProfileRouter);
  app.use('/api', publishingRouter);
  app.use('/api', milestonesRouter);
  app.use('/api', meetingRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api', tasksRouter);
  app.use('/api/users', usersRouter);
  app.use(healthRouter);

  // Error handling middleware must be last
  app.use(errorHandler);

  return app;
}

export default createApp;
