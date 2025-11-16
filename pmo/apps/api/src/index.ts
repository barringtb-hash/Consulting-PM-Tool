import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import healthRouter from './routes/health';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(healthRouter);

const port = process.env.PORT ?? '4000';

app.listen(Number(port), () => {
  console.log(`API server listening on port ${port}`);
});
