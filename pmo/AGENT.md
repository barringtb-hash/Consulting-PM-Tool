# Contributor Guide

Welcome to the PMO monorepo. This tree is organized as follows:

- `apps/`: Application workspaces.
- `packages/`: Shared packages.
- `prisma/`: Data schema assets.
- `docs/`: Documentation.

When editing files within this tree:

- Use TypeScript + Prettier defaults configured at the repo root.
- Run `npm run lint` and `npm run test` from `/pmo` before committing changes touching TypeScript code.
