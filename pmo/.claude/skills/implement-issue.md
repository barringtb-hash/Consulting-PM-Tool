# Implement Issue from Bug Tracking

Implement a feature or fix a bug based on an issue from GitHub or other bug tracking system.

## Parameters

- Issue URL or ID (optional): Pass as argument to `/implement-issue <url-or-id>`

## Instructions

1. If an issue URL/ID is provided, fetch the issue details
2. Read and understand the issue requirements
3. Create a todo list breaking down the implementation steps
4. Explore the codebase to understand existing patterns
5. Implement the solution following project conventions
6. Run tests to verify the implementation
7. Run lint to ensure code quality

## Project Conventions

### Backend (API - apps/api)

- Route handlers in `src/routes/`
- Business logic in `src/services/`
- Validation with Zod in `src/validation/`
- Tests in `test/`

### Frontend (Web - apps/web)

- Page components in `src/pages/`
- Reusable components in `src/components/`
- API hooks in `src/api/hooks/`
- UI primitives in `src/ui/`

## After Implementation

- Run `npm run lint` to check code quality
- Run `npm run test` to verify tests pass
- Summarize changes made for the user
