import husky from 'husky';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(resolve(__dirname, '..', '..'));

const result = husky('pmo/.husky');
if (result) {
  console.error(result);
  process.exit(1);
}
