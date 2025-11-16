# Consulting-PM-Tool

A PM tool that will help track consulting projects.

## Development

Start the API workspace in watch mode:

```bash
cd pmo
npm run dev --workspace pmo-api
```

## Continuous Integration

This repository uses a dependency-free GitHub Actions workflow (`.github/workflows/ci.yml`) that runs `npm install`, `npm run lint`, `npm run test`, and `npm run build` from the `/pmo` workspace on every push and pull request.
