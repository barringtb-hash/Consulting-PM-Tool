import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const isCi =
  process.env.CI === 'true' ||
  process.env.CI === '1' ||
  process.env.VERCEL === '1';

const isHuskyDisabled = process.env.HUSKY === '0';

if (isCi || isHuskyDisabled) {
  console.log('[husky] Skipping git hook installation (CI / HUSKY=0).');
  process.exit(0);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(resolve(__dirname, '..', '..'));

async function main() {
  try {
    const husky = await import('husky');
    const installFn = husky.default?.install ?? husky.install ?? husky.default;

    if (typeof installFn === 'function') {
      const result = await installFn('pmo/.husky');

      if (result) {
        console.error(result);
        process.exit(1);
      }
    } else {
      console.warn('[husky] No install() export found, skipping.');
    }
  } catch (error) {
    if (error && error.code === 'ERR_MODULE_NOT_FOUND') {
      console.warn(
        "[husky] 'husky' package not found. Skipping git hook installation.",
      );
    } else {
      console.warn('[husky] Failed to install git hooks. Skipping.', error);
    }

    process.exit(0);
  }
}

void main();
