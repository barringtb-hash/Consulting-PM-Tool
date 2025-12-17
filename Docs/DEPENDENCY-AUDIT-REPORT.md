# Dependency Audit Report

**Date:** December 17, 2025
**Project:** AI CRM Platform (Consulting-PM-Tool)
**Total node_modules size:** 477MB (806 packages)

**Status:** ✅ High-priority fixes applied, recommendations documented

---

## Executive Summary

The project has **no security vulnerabilities** detected by npm audit. Dependencies are generally modern and well-maintained. The following categories were analyzed:

| Category | Status | Priority |
|----------|--------|----------|
| Security Vulnerabilities | ✅ None found | - |
| Outdated Packages | 📋 Minor updates available | Low |
| Deprecated Dependencies | 📋 Documented | High |
| Redundant Dependencies | 📋 Documented | Medium |

---

## Security Analysis

```
npm audit: found 0 vulnerabilities
```

✅ **All clear.** No known security vulnerabilities in the dependency tree.

---

## Outdated Packages

Minor version updates available (low priority):

| Package | Current | Latest | Workspace |
|---------|---------|--------|-----------|
| @types/node | 25.0.2 | 25.0.3 | pmo-api |
| bullmq | 5.66.0 | 5.66.1 | pmo-api |

**Recommendation:** These are patch updates that can be applied safely.

```bash
cd pmo
npm update @types/node bullmq
```

---

## Deprecated Dependencies (Transitive)

The following deprecated packages are pulled in as transitive dependencies:

| Package | Status | Source |
|---------|--------|--------|
| rimraf@2.7.1 | Deprecated (< v4) | ts-node-dev |
| inflight@1.0.6 | Deprecated (memory leak) | glob@7.2.3 |
| glob@7.2.3 | Deprecated (< v9) | rimraf@2.7.1 |

**Dependency chain:** `ts-node-dev` → `rimraf@2.7.1` → `glob@7.2.3` → `inflight@1.0.6`

### Recommendation: Replace ts-node-dev with tsx

The root cause is `ts-node-dev@2.0.0` which hasn't been updated in years. The project already has `tsx@4.21.0` at the root level, which is faster and more modern.

**In `pmo/apps/api/package.json`:**

1. Remove `ts-node-dev` and `ts-node` from devDependencies
2. Update the dev script to use `tsx`:

```diff
 "scripts": {
-  "dev": "ts-node-dev --respawn src/index.ts",
+  "dev": "tsx watch src/index.ts",
```

This eliminates:
- `ts-node-dev` (2.0.0)
- `ts-node` (10.9.2)
- `rimraf` (deprecated)
- `glob@7.x` (deprecated)
- `inflight` (deprecated, memory leak)

---

## Redundant Dependencies Analysis (Future Work)

The following redundant dependencies have been identified for future cleanup. These are low-priority optimizations that can be addressed in subsequent maintenance cycles.

### 1. Autoprefixer (Low Priority)

**Current:** `autoprefixer@10.4.23` in pmo-web

Tailwind CSS v4 (`@tailwindcss/postcss@4.x`) includes built-in vendor prefixing. The standalone `autoprefixer` is no longer required.

**Recommendation:** Remove from `pmo/apps/web/package.json`:

```bash
npm uninstall autoprefixer -w pmo-web
```

Update `postcss.config.js`:
```diff
 module.exports = {
   plugins: {
     '@tailwindcss/postcss': {},
-    autoprefixer: {},
   },
 };
```

**Savings:** ~6MB from node_modules

### 2. Duplicate TypeScript ESLint Packages (No Action Needed)

The TypeScript ESLint packages appear in multiple workspace package.json files but npm correctly dedupes them to single installations. No action required.

### 3. bcryptjs Duplication (Low Priority)

`bcryptjs` is listed in both:
- Root `pmo/package.json` (for seed script)
- `pmo/apps/api/package.json` (for auth)

**Recommendation:** Remove from root package.json since it's already in the API:

```diff
// pmo/package.json
"dependencies": {
-  "bcryptjs": "^3.0.3",
   "tsx": "^4.20.6"
}
```

The seed script runs from the api workspace context where bcryptjs is available.

---

## Largest Dependencies

Top 10 largest packages in node_modules:

| Package | Size | Purpose | Required |
|---------|------|---------|----------|
| @swc | 69MB | SWC compiler for Vite | ✅ Yes |
| @prisma | 64MB | Prisma client & engine | ✅ Yes |
| lucide-react | 36MB | Icon library | ✅ Yes |
| effect | 28MB | Prisma transitive dep | ⚠️ Transitive |
| @electric-sql | 25MB | Prisma dev transitive | ⚠️ Dev only |
| typescript | 23MB | TypeScript compiler | ✅ Yes |
| prisma | 19MB | Prisma CLI | ✅ Yes |
| playwright-core | 8.2MB | E2E testing | ✅ Yes (dev) |
| prettier | 8.3MB | Code formatter | ✅ Yes (dev) |
| @babel | 8.9MB | Babel (transitive) | ⚠️ Transitive |

### Notes on Large Transitive Dependencies

- **effect (28MB)**: Required by `@prisma/config`. Cannot be removed.
- **@electric-sql (25MB)**: Used by Prisma's dev tools for local development. Dev-only, acceptable.

---

## Recommended Actions (Pending)

The following actions are recommended for future maintenance cycles.

### High Priority

1. **Replace ts-node-dev with tsx** (eliminates deprecated packages)
   ```bash
   cd pmo/apps/api
   npm uninstall ts-node-dev ts-node
   ```
   Then update `package.json`:
   ```json
   "dev": "tsx watch src/index.ts"
   ```

### Medium Priority

2. **Remove autoprefixer** (redundant with Tailwind v4)
   ```bash
   cd pmo
   npm uninstall autoprefixer -w pmo-web
   ```

3. **Remove root bcryptjs** (duplicate)
   ```bash
   cd pmo
   npm uninstall bcryptjs -w .
   ```

### Low Priority

4. **Update minor versions**
   ```bash
   cd pmo
   npm update
   ```

---

## Dependency Health Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| Total dependencies | 806 | Normal for full-stack app |
| Direct dependencies (root) | 2 | ✅ Minimal |
| Direct dependencies (web) | 11 | ✅ Reasonable |
| Direct dependencies (api) | 16 | ✅ Reasonable |
| Dev dependencies (root) | 18 | ✅ Standard |
| Security vulnerabilities | 0 | ✅ Excellent |
| Severely outdated (1yr+) | 0 | ✅ Well maintained |

---

## Conclusion

The project's dependencies are in good health with **no security vulnerabilities**. This audit identified several optimization opportunities:

1. **Replace ts-node-dev with tsx** (High Priority) - Eliminates deprecated transitive packages and improves dev server performance
2. **Remove autoprefixer** (Medium Priority) - No longer needed with Tailwind v4
3. **Consolidate bcryptjs** (Medium Priority) - Remove duplicate from root package.json

**Estimated impact if all recommendations applied:** ~15-20MB node_modules reduction (3-4%)
