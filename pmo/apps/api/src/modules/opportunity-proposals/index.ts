/**
 * Opportunity Proposals Module
 *
 * Provides cost estimation, SOW generation, and contract management
 * for the CRM opportunity workflow.
 *
 * Features:
 * - Cost Estimates: Detailed cost breakdowns with AI-assisted estimation
 * - SOW Generation: AI-powered Statement of Work generation
 * - Contract Generation: Professional contracts with digital signature workflow
 */

// Services
export { costEstimateService } from './services/cost-estimate.service';
export { aiEstimateGeneratorService } from './services/ai-estimate-generator.service';
export { sowGeneratorService } from './services/sow-generator.service';
export { contractService } from './services/contract.service';
export { contractSigningService } from './services/contract-signing.service';

// Routers
export { default as costEstimateRouter } from './cost-estimate.router';
export { default as sowRouter } from './sow.router';
export { default as contractsRouter } from './contracts.router';
export { default as contractsPublicRouter } from './contracts-public.router';
