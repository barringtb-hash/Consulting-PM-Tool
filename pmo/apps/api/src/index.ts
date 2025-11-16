import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';

import authRouter from './auth/auth.routes';
import { env } from './config/env';
import healthRouter from './routes/health';

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
app.use(healthRouter);

const port = env.port;

app.listen(Number(port), () => {
  console.log(`API server listening on port ${port}`);
});
