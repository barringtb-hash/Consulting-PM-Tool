# Build Project

Build the PMO application for production deployment.

## Instructions

Run the build commands from the `/pmo` directory:

```bash
# Build both API and Web
npm run build --workspace pmo-api && npm run build --workspace pmo-web
```

Or build individually:

- API only: `npm run build --workspace pmo-api`
- Web only: `npm run build --workspace pmo-web`

## Expected Behavior

- TypeScript should compile without errors
- Build artifacts will be created in `dist/` directories
- Report any compilation errors to the user with file locations

## Common Issues

- Type errors: Check that all imports are correct and types are properly defined
- Missing dependencies: Run `npm install` first
