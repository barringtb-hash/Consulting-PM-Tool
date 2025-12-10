/**
 * Customer Success Platform Module
 *
 * A Gainsight-inspired Customer Success Platform optimized for SMB.
 *
 * Features:
 * - Health Scoring: Weighted composite scores with trend analysis
 * - CTAs (Call-to-Actions): Actionable items for CSM workflow
 * - Playbooks: Reusable task sequences for standardized responses
 * - Success Plans: Goal-based customer success plans with objectives
 * - Activity Logging: Unified timeline of customer interactions
 */

export * from './health-score.service';
export * from './cta.service';
export * from './playbook.service';
export * from './success-plan.service';
export { default as customerSuccessRouter } from './customer-success.router';
