# Commit Changes

Create a git commit for staged changes.

## Instructions

1. Run `git status` to see all changes (never use -uall flag)
2. Run `git diff` to review staged and unstaged changes
3. Run `git log --oneline -5` to see recent commit style
4. Analyze changes and draft a meaningful commit message
5. Stage relevant files with `git add`
6. Create the commit with descriptive message

## Commit Message Format

```
<type>: <short description>

<optional body explaining the "why">

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `docs`: Documentation
- `test`: Adding tests
- `chore`: Maintenance

## Rules

- Never commit `.env` files or credentials
- Never use `--force` or `--amend` unless explicitly requested
- Never skip hooks (--no-verify)
- Use HEREDOC for multiline commit messages
