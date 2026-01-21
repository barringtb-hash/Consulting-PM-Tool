/**
 * Route Configuration Module - TypeScript Re-export
 *
 * This file exists for compatibility. The actual implementation is in index.tsx.
 * TypeScript module resolution will prefer .tsx over .ts, but some tooling
 * may need this file. It simply re-exports everything from index.tsx.
 *
 * NOTE: This file can be safely deleted if your tooling supports .tsx barrel files.
 */
export * from './components';
export { authRoutes } from './auth.routes';
export { coreRoutes } from './core.routes';
export { crmRoutes } from './crm.routes';
export { adminRoutes } from './admin.routes';
export { aiToolsRoutes } from './ai-tools.routes';
export { infrastructureRoutes } from './infrastructure.routes';
export { financeRoutes } from './finance.routes';
export { marketingRoutes } from './marketing.routes';
