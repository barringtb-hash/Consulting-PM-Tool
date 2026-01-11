## Description

<!-- Briefly describe what this PR does -->

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)

## Related Issues

<!-- Link any related issues: Fixes #123, Relates to #456 -->

---

## Documentation Checklist

Before submitting this PR, confirm the following:

### Required for All PRs

- [ ] Code changes have appropriate inline comments for complex logic
- [ ] Public functions/methods have JSDoc documentation with `@param`, `@returns`, `@throws`
- [ ] No hardcoded secrets or sensitive data

### Required When Applicable

**New API Endpoints:**
- [ ] Updated `CLAUDE.md` API reference table
- [ ] Added request/response examples if complex

**New Module:**
- [ ] Added entry to `Docs/MODULES.md`
- [ ] Created file-level JSDoc in router/service files
- [ ] Updated `CLAUDE.md` module section

**Database Changes (Prisma):**
- [ ] Added model-level comments in `schema.prisma`
- [ ] Updated `CLAUDE.md` database models section
- [ ] Added deprecation notices if replacing existing models

**New Page/Feature:**
- [ ] Updated relevant documentation in `Docs/`
- [ ] Added route to `CLAUDE.md` if user-facing

**Breaking Changes:**
- [ ] Added migration notes to relevant docs
- [ ] Updated API versioning docs if applicable

**Configuration Changes:**
- [ ] Updated environment variable documentation
- [ ] Updated `.env.example` files

### Verification

- [ ] I have read the documentation guidelines in `CLAUDE.md`
- [ ] I have verified existing documentation remains accurate after my changes

---

## Testing

<!-- Describe the testing you've done -->

- [ ] Unit tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Manual testing completed

---

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->
