import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';

import authRouter from './auth/auth.routes';
import clientsRouter from './routes/clients';
import contactsRouter from './routes/contacts';
import documentsRouter from './routes/documents';
import healthRouter from './routes/health';
import milestonesRouter from './routes/milestone.routes';
import projectsRouter from './routes/projects';
import tasksRouter from './routes/task.routes';

export function createApp(): express.Express {
  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(authRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/contacts', contactsRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api', milestonesRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api', tasksRouter);
  app.use(healthRouter);

  return app;
}

export default createApp;
