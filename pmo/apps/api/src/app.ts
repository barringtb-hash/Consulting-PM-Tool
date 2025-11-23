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
import meetingRouter from './modules/meetings/meeting.router';
import projectsRouter from './routes/projects';
import tasksRouter from './routes/task.routes';
import usersRouter from './routes/users';
import { errorHandler } from './middleware/error.middleware';

export function createApp(): express.Express {
  const app = express();

  // Trust proxy - enables req.ip to work correctly behind reverse proxies
  // In production, configure this based on your infrastructure:
  // - 'loopback' for local proxies only
  // - number (e.g., 1) for a specific number of proxy hops
  // - function for custom logic
  app.set('trust proxy', true);

  app.use(
    cors({
      origin: true,
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
