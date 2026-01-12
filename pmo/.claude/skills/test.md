# Run Tests

Run unit tests for the PMO application.

## Instructions

Run tests from the `/pmo` directory:

```bash
# Run all tests
npm run test

# Run API tests only
npm run test --workspace pmo-api

# Run Web tests only
npm run test --workspace pmo-web

# Run E2E tests (headless)
npm run test:e2e
```

## Expected Behavior

- All tests should pass
- Report any failing tests with clear descriptions
- If tests fail, analyze the failure and suggest fixes

## Test Frameworks

- Unit tests: Vitest
- E2E tests: Playwright

## Test Accounts (for E2E)

- Admin: `admin@pmo.test` / `AdminDemo123!`
- Consultant: `avery.chen@pmo.test` / `PmoDemo123!`
