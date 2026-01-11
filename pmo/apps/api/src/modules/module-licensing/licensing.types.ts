/**
 * Module Licensing Type Definitions
 *
 * Defines the structure for module licensing, feature gating,
 * and usage metering across the CRM platform.
 */

export type ModuleTier = 'TRIAL' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
export type ModuleCategory =
  | 'core'
  | 'crm'
  | 'ai'
  | 'integration'
  | 'pmo'
  | 'analytics';

/**
 * Extended module definition with licensing information
 */
export interface LicensedModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: ModuleCategory;
  tier: 'core' | 'premium' | 'enterprise';
  defaultLimits: Record<string, number>;
  features: string[];
  pricing?: {
    monthly: number;
    yearly: number;
    currency: string;
  };
}

/**
 * Tenant module status with usage information
 */
export interface TenantModuleStatus {
  moduleId: string;
  enabled: boolean;
  tier: ModuleTier;
  trialEndsAt?: Date;
  isTrialExpired: boolean;
  usageLimits: Record<string, number>;
  currentUsage: Record<string, number>;
  usagePercentage: Record<string, number>;
  isOverLimit: boolean;
  limitWarnings: string[];
}

/**
 * Module access check result
 */
export interface ModuleAccessResult {
  allowed: boolean;
  reason?: string;
  upgradeUrl?: string;
  trialDaysRemaining?: number;
  usagePercentage?: number;
}

/**
 * Module activation request
 */
export interface ModuleActivationRequest {
  moduleId: string;
  tier: ModuleTier;
  startTrial?: boolean;
  trialDays?: number;
  customLimits?: Record<string, number>;
}

/**
 * Usage event for tracking
 */
export interface UsageEventInput {
  tenantId: string;
  moduleId: string;
  eventType: string;
  quantity?: number;
  userId?: number;
  entityType?: string;
  entityId?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Usage summary for a period
 */
export interface UsageSummaryResult {
  tenantId: string;
  moduleId: string;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  periodStart: Date;
  periodEnd: Date;
  totalEvents: number;
  totalQuantity: number;
  breakdown: Record<string, number>;
  estimatedCost?: number;
}
