/**
 * Tenant-related type definitions
 */

export type TenantPlan = 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
export type TenantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
export type TenantRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  tenantPlan: TenantPlan;
}

export interface TenantUserContext extends TenantContext {
  userId: number;
  tenantRole: TenantRole;
}

export interface CreateTenantInput {
  name: string;
  slug?: string; // Optional - will be generated from name if not provided
  plan?: TenantPlan;
  billingEmail?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateTenantInput {
  name?: string;
  plan?: TenantPlan;
  billingEmail?: string;
  settings?: Record<string, unknown>;
  status?: TenantStatus;
}

export interface TenantBrandingInput {
  logoUrl?: string | null;
  logoLightUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  customCss?: string | null;
  emailLogoUrl?: string | null;
  emailFooterText?: string | null;
}

export interface TenantDomainInput {
  domain: string;
  isPrimary?: boolean;
}

export interface TenantModuleInput {
  moduleId: string;
  enabled?: boolean;
  tier?: 'TRIAL' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  usageLimits?: Record<string, number>;
  settings?: Record<string, unknown>;
}

// Rate limit configuration by plan
export const RATE_LIMITS: Record<TenantPlan, number> = {
  TRIAL: 100,
  STARTER: 200,
  PROFESSIONAL: 500,
  ENTERPRISE: 1000,
};

// Default module limits by tier
export const MODULE_LIMITS = {
  'ai-chatbot': {
    TRIAL: { conversations: 100, messagesPerConversation: 20 },
    BASIC: { conversations: 500, messagesPerConversation: 50 },
    PREMIUM: { conversations: 2000, messagesPerConversation: 100 },
    ENTERPRISE: { conversations: -1, messagesPerConversation: -1 }, // -1 = unlimited
  },
  'ai-document-analyzer': {
    TRIAL: { documentsPerMonth: 25, pagesPerDocument: 10 },
    BASIC: { documentsPerMonth: 100, pagesPerDocument: 50 },
    PREMIUM: { documentsPerMonth: 500, pagesPerDocument: 100 },
    ENTERPRISE: { documentsPerMonth: -1, pagesPerDocument: -1 },
  },
  pmo: {
    TRIAL: { projects: 5, tasksPerProject: 50 },
    BASIC: { projects: 25, tasksPerProject: 200 },
    PREMIUM: { projects: 100, tasksPerProject: 500 },
    ENTERPRISE: { projects: -1, tasksPerProject: -1 },
  },
} as const;
