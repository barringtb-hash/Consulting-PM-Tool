import { execSync } from 'node:child_process';
import path from 'node:path';

export default function globalSetup() {
  const workspaceRoot = path.resolve(__dirname, '..');
  const repoRoot = path.resolve(workspaceRoot, '..', '..');
  const schemaPath = path.join(repoRoot, 'prisma', 'schema.prisma');

  // Generate Prisma client once for all test workers
  execSync(`npx prisma generate --schema "${schemaPath}"`, {
    cwd: workspaceRoot,
    env: {
      ...process.env,
    },
    stdio: 'inherit',
  });
}
