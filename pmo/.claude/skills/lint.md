# Lint Code

Run ESLint to check code quality.

## Instructions

Run linting from the `/pmo` directory:

```bash
npm run lint
```

## Expected Behavior

- Zero warnings policy is enforced (`--max-warnings=0`)
- Fix any linting errors before committing
- For auto-fixable issues, suggest running: `npm run lint -- --fix`

## Common Issues

- Unused variables: Remove or use them
- Missing dependencies in useEffect: Add to dependency array
- Import order: Use consistent ordering
- Type issues: Ensure proper TypeScript types
