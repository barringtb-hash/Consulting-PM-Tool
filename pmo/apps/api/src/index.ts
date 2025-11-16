import { createApp } from './app';
import { env } from './config/env';

const app = createApp();
const port = env.port;

app.listen(Number(port), () => {
  console.log(`API server listening on port ${port}`);
});
