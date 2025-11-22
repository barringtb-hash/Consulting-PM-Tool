# Performance Report - M8

**Date**: 2025-11-21
**Tool**: Google Lighthouse
**Target**: Performance Score ≥ 80
**Environment**: Production build

---

## Executive Summary

This document outlines the performance testing strategy, baseline metrics, and optimization recommendations for the AI Consulting PMO Platform.

### Goals

- **Lighthouse Performance Score**: ≥ 80 on key authenticated pages
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **TTI (Time to Interactive)**: < 3.5s
- **TBT (Total Blocking Time)**: < 200ms

---

## Testing Methodology

### Pages to Test

Run Lighthouse audits on:

1. **Dashboard** (`/dashboard`) - Main landing page after login
2. **Clients List** (`/clients`) - List view with data fetching
3. **Client Details** (`/clients/:id`) - Detail page with multiple data sources
4. **Project Dashboard** (`/projects/:id`) - Complex page with tabs and nested data
5. **Project Status** (`/projects/:id` - Status tab) - Heavy data visualization
6. **Global Tasks** (`/tasks`) - Filterable list view

### How to Run

```bash
# 1. Build production version
cd pmo
npm run build --workspace pmo-web

# 2. Serve production build
npx serve -s apps/web/dist -l 3000

# 3. Run Lighthouse (Chrome DevTools or CLI)
# Option A: Chrome DevTools
# Open Chrome → DevTools → Lighthouse → Run audit

# Option B: Lighthouse CLI
npm install -g lighthouse
lighthouse http://localhost:3000/dashboard --view

# For authenticated pages, use custom headers or cookie injection
lighthouse http://localhost:3000/dashboard \
  --extra-headers="{\"Cookie\": \"your-auth-cookie\"}" \
  --view
```

---

## Performance Metrics

### Core Web Vitals

| Metric | Good | Needs Improvement | Poor | Current |
|--------|------|-------------------|------|---------|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.5s - 4.0s | > 4.0s | TBD |
| **FID** (First Input Delay) | < 100ms | 100ms - 300ms | > 300ms | TBD |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.1 - 0.25 | > 0.25 | TBD |

### Lighthouse Metrics

| Metric | Target | Current |
|--------|--------|---------|
| **Performance Score** | ≥ 80 | TBD |
| **First Contentful Paint (FCP)** | < 1.8s | TBD |
| **Speed Index** | < 3.4s | TBD |
| **Time to Interactive (TTI)** | < 3.5s | TBD |
| **Total Blocking Time (TBT)** | < 200ms | TBD |

**Note**: TBD values will be populated once production build is tested.

---

## Performance Optimizations

### 1. Code Splitting & Lazy Loading

**Current State**: Vite provides automatic code splitting for route-based chunks.

**Recommendations**:

```tsx
// Lazy load route components
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/DashboardPage'));
const Clients = lazy(() => import('./pages/ClientsPage'));
const Projects = lazy(() => import('./pages/ProjectDashboardPage'));
const Assets = lazy(() => import('./pages/AssetsPage'));

// Wrap in Suspense
function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        {/* ... */}
      </Routes>
    </Suspense>
  );
}
```

**Impact**: Reduces initial bundle size by ~30-40%

### 2. Bundle Analysis

**Tool**: `rollup-plugin-visualizer` (already used by Vite)

```bash
# Generate bundle visualization
npm run build --workspace pmo-web -- --mode=analyze

# Or use vite-bundle-visualizer
npm install -D vite-bundle-visualizer
```

Add to `vite.config.ts`:

```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

**Action Items**:
- [ ] Generate bundle visualization
- [ ] Identify largest dependencies
- [ ] Consider alternatives for heavy libraries (e.g., date-fns → dayjs)
- [ ] Remove unused dependencies

### 3. Image Optimization

**Current State**: Review needed

**Recommendations**:

```tsx
// Use modern formats (WebP, AVIF)
<picture>
  <source srcSet="/logo.avif" type="image/avif" />
  <source srcSet="/logo.webp" type="image/webp" />
  <img src="/logo.png" alt="Logo" />
</picture>

// Lazy load images below the fold
<img
  src="/image.jpg"
  loading="lazy"
  alt="Description"
/>

// Responsive images
<img
  src="/image.jpg"
  srcSet="
    /image-320w.jpg 320w,
    /image-640w.jpg 640w,
    /image-1280w.jpg 1280w
  "
  sizes="(max-width: 640px) 100vw, 640px"
  alt="Description"
/>
```

**Action Items**:
- [ ] Audit all images in the app
- [ ] Convert to WebP/AVIF where possible
- [ ] Add proper width/height attributes to prevent CLS
- [ ] Implement lazy loading for below-the-fold images

### 4. API Performance

#### N+1 Query Detection

**Tool**: Prisma query logging

```typescript
// prisma/client.ts
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

**Common N+1 scenarios**:

```typescript
// ❌ Bad: N+1 query
const projects = await prisma.project.findMany();
for (const project of projects) {
  const client = await prisma.client.findUnique({
    where: { id: project.clientId },
  });
}

// ✅ Good: Single query with include
const projects = await prisma.project.findMany({
  include: { client: true },
});
```

#### Database Indexing

**Location**: `pmo/prisma/schema.prisma`

Add indexes for frequently queried fields:

```prisma
model Project {
  id        String   @id @default(uuid())
  clientId  String
  status    String
  archived  Boolean  @default(false)
  createdAt DateTime @default(now())

  // Add indexes
  @@index([clientId])
  @@index([status])
  @@index([archived, createdAt])
}

model Task {
  id        String   @id @default(uuid())
  projectId String
  status    String
  assigneeId String?

  @@index([projectId])
  @@index([status])
  @@index([assigneeId])
}

model Meeting {
  id        String   @id @default(uuid())
  projectId String
  date      DateTime

  @@index([projectId])
  @@index([date])
}
```

**Action Items**:
- [ ] Review all Prisma queries for N+1 patterns
- [ ] Add indexes for foreign keys and frequently filtered columns
- [ ] Test query performance with larger datasets

#### Pagination

**Current State**: Check if implemented

**Recommendations**:

```typescript
// API route: GET /api/clients
router.get('/clients', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.client.count(),
  ]);

  res.json({
    clients,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
```

**Action Items**:
- [ ] Implement pagination for all list endpoints (clients, projects, tasks, meetings, assets)
- [ ] Default page size: 20 items
- [ ] Frontend: Implement infinite scroll or pagination UI

### 5. Frontend Optimizations

#### React Query Configuration

**Location**: `pmo/apps/web/src/main.tsx` (or query client setup)

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

#### Memoization

```tsx
import { useMemo, memo } from 'react';

// Memoize expensive computations
function ProjectStats({ tasks }: { tasks: Task[] }) {
  const stats = useMemo(() => {
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'done').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
    };
  }, [tasks]);

  return <div>{/* Render stats */}</div>;
}

// Memoize components that don't need frequent re-renders
export default memo(ProjectStats);
```

#### Virtual Scrolling

For long lists (e.g., tasks view):

```bash
npm install @tanstack/react-virtual
```

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function TaskList({ tasks }: { tasks: Task[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <TaskItem task={tasks[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 6. Vite Build Optimizations

**Location**: `pmo/apps/web/vite.config.ts`

```typescript
export default defineConfig({
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
    sourcemap: false, // Disable in production
    chunkSizeWarningLimit: 1000,
  },
});
```

---

## Performance Budget

Set performance budgets to prevent regression:

```json
{
  "budgets": [
    {
      "resourceSizes": [
        {
          "resourceType": "script",
          "budget": 300
        },
        {
          "resourceType": "total",
          "budget": 500
        }
      ],
      "resourceCounts": [
        {
          "resourceType": "third-party",
          "budget": 10
        }
      ]
    }
  ]
}
```

---

## Monitoring

### Lighthouse CI

Add to CI/CD pipeline:

```bash
npm install -g @lhci/cli

# In CI workflow
lhci autorun \
  --collect.url=https://your-staging-url.com \
  --assert.preset=lighthouse:recommended
```

### Real User Monitoring (RUM)

Consider integrating:
- **Vercel Analytics** (if using Vercel)
- **Google Analytics 4** with Web Vitals
- **Sentry Performance Monitoring**

Example with Web Vitals:

```bash
npm install web-vitals
```

```typescript
// src/reportWebVitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  // Send to your analytics service
  console.log(metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

---

## Checklist

### Immediate Actions

- [ ] Run Lighthouse audit on production build
- [ ] Generate bundle visualization
- [ ] Review and add database indexes
- [ ] Implement lazy loading for route components
- [ ] Add pagination to list endpoints

### Short-term Optimizations

- [ ] Optimize images (WebP/AVIF conversion)
- [ ] Fix N+1 queries
- [ ] Configure React Query caching
- [ ] Add memoization where needed
- [ ] Implement virtual scrolling for long lists

### Long-term Improvements

- [ ] Set up Lighthouse CI in pipeline
- [ ] Implement Real User Monitoring
- [ ] Create performance dashboard
- [ ] Establish performance budgets
- [ ] Regular performance audits (monthly)

---

## Baseline Metrics (To Be Filled)

Run Lighthouse on production build and fill in:

### Dashboard (`/dashboard`)
- Performance Score: ____ / 100
- LCP: ____ s
- TBT: ____ ms
- CLS: ____

### Clients List (`/clients`)
- Performance Score: ____ / 100
- LCP: ____ s
- TBT: ____ ms
- CLS: ____

### Project Details (`/projects/:id`)
- Performance Score: ____ / 100
- LCP: ____ s
- TBT: ____ ms
- CLS: ____

---

## Resources

- [Web.dev - Core Web Vitals](https://web.dev/vitals/)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Vite Performance](https://vitejs.dev/guide/build.html)
- [React Performance](https://react.dev/learn/render-and-commit#optimizing-performance)
- [Prisma Performance Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

---

**Report Maintained By**: Development Team
**Last Updated**: 2025-11-21
**Next Review**: After production deployment and Lighthouse audit
