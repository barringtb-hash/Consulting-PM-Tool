/**
 * CRM Integration Service for Content Generator
 *
 * Enables content personalization using CRM data from:
 * - Accounts (company info, industry, health scores)
 * - CRMContacts (names, titles, contact info)
 * - Opportunities (deal info, stage, amounts)
 *
 * Supports dynamic placeholders like:
 * - {{crm.account.name}}
 * - {{crm.contact.firstName}}
 * - {{crm.opportunity.amount}}
 */

import { prisma } from '../../../prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// TYPES
// ============================================================================

export interface CRMPlaceholders {
  account?: AccountPlaceholders;
  contact?: ContactPlaceholders;
  opportunity?: OpportunityPlaceholders;
}

export interface AccountPlaceholders {
  id: number;
  name: string;
  website?: string;
  phone?: string;
  industry?: string;
  type: string;
  employeeCount?: string;
  annualRevenue?: string;
  healthScore?: number;
  engagementScore?: number;
  ownerName?: string;
  ownerEmail?: string;
}

export interface ContactPlaceholders {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  department?: string;
  lifecycle: string;
  isPrimary: boolean;
}

export interface OpportunityPlaceholders {
  id: number;
  name: string;
  description?: string;
  amount?: string;
  amountFormatted?: string;
  probability?: number;
  weightedAmount?: string;
  currency: string;
  status: string;
  stageName?: string;
  expectedCloseDate?: string;
  ownerName?: string;
  ownerEmail?: string;
}

export interface ContentGenerationWithCRMInput {
  title: string;
  type: string;
  prompt?: string;
  templateId?: number;
  placeholderValues?: Record<string, string>;
  keywords?: string[];
  targetLength?: 'short' | 'medium' | 'long';
  tone?: string;
  generateVariants?: number;
  // CRM-specific
  accountId?: number;
  contactId?: number;
  opportunityId?: number;
}

// ============================================================================
// CRM DATA FETCHING
// ============================================================================

/**
 * Get account data formatted as placeholders
 */
export async function getAccountPlaceholders(
  accountId: number,
): Promise<AccountPlaceholders | null> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      owner: { select: { name: true, email: true } },
    },
  });

  if (!account) return null;

  return {
    id: account.id,
    name: account.name,
    website: account.website || undefined,
    phone: account.phone || undefined,
    industry: account.industry || undefined,
    type: account.type,
    employeeCount: account.employeeCount || undefined,
    annualRevenue: account.annualRevenue
      ? formatCurrency(account.annualRevenue)
      : undefined,
    healthScore: account.healthScore || undefined,
    engagementScore: account.engagementScore || undefined,
    ownerName: account.owner.name || undefined,
    ownerEmail: account.owner.email,
  };
}

/**
 * Get contact data formatted as placeholders
 */
export async function getContactPlaceholders(
  contactId: number,
): Promise<ContactPlaceholders | null> {
  const contact = await prisma.cRMContact.findUnique({
    where: { id: contactId },
  });

  if (!contact) return null;

  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    fullName: `${contact.firstName} ${contact.lastName}`,
    email: contact.email || undefined,
    phone: contact.phone || undefined,
    mobile: contact.mobile || undefined,
    jobTitle: contact.jobTitle || undefined,
    department: contact.department || undefined,
    lifecycle: contact.lifecycle,
    isPrimary: contact.isPrimary,
  };
}

/**
 * Get opportunity data formatted as placeholders
 */
export async function getOpportunityPlaceholders(
  opportunityId: number,
): Promise<OpportunityPlaceholders | null> {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: {
      stage: { select: { name: true } },
      owner: { select: { name: true, email: true } },
    },
  });

  if (!opportunity) return null;

  return {
    id: opportunity.id,
    name: opportunity.name,
    description: opportunity.description || undefined,
    amount: opportunity.amount ? opportunity.amount.toString() : undefined,
    amountFormatted: opportunity.amount
      ? formatCurrency(opportunity.amount, opportunity.currency)
      : undefined,
    probability: opportunity.probability || undefined,
    weightedAmount: opportunity.weightedAmount
      ? formatCurrency(opportunity.weightedAmount, opportunity.currency)
      : undefined,
    currency: opportunity.currency,
    status: opportunity.status,
    stageName: opportunity.stage?.name || undefined,
    expectedCloseDate: opportunity.expectedCloseDate
      ? formatDate(opportunity.expectedCloseDate)
      : undefined,
    ownerName: opportunity.owner.name || undefined,
    ownerEmail: opportunity.owner.email,
  };
}

/**
 * Get primary contact for an account
 */
export async function getPrimaryContactForAccount(
  accountId: number,
): Promise<ContactPlaceholders | null> {
  const contact = await prisma.cRMContact.findFirst({
    where: {
      accountId,
      isPrimary: true,
      archived: false,
    },
  });

  if (!contact) {
    // Fallback to first contact
    const fallback = await prisma.cRMContact.findFirst({
      where: { accountId, archived: false },
      orderBy: { createdAt: 'asc' },
    });
    if (!fallback) return null;
    return getContactPlaceholders(fallback.id);
  }

  return getContactPlaceholders(contact.id);
}

/**
 * Get all CRM placeholders for an account
 */
export async function getCRMPlaceholdersForAccount(
  accountId: number,
  opportunityId?: number,
): Promise<CRMPlaceholders> {
  const [account, contact, opportunity] = await Promise.all([
    getAccountPlaceholders(accountId),
    getPrimaryContactForAccount(accountId),
    opportunityId ? getOpportunityPlaceholders(opportunityId) : null,
  ]);

  return {
    account: account || undefined,
    contact: contact || undefined,
    opportunity: opportunity || undefined,
  };
}

/**
 * Get all CRM placeholders for an opportunity
 */
export async function getCRMPlaceholdersForOpportunity(
  opportunityId: number,
): Promise<CRMPlaceholders> {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    select: { accountId: true },
  });

  if (!opportunity) {
    return {};
  }

  return getCRMPlaceholdersForAccount(opportunity.accountId, opportunityId);
}

// ============================================================================
// PLACEHOLDER RESOLUTION
// ============================================================================

/**
 * Resolve CRM placeholders in text
 * Supports: {{crm.account.name}}, {{crm.contact.firstName}}, etc.
 */
export function resolveCRMPlaceholders(
  text: string,
  crmData: CRMPlaceholders,
): string {
  const placeholderMap = flattenCRMPlaceholders(crmData);

  let result = text;
  for (const [key, value] of Object.entries(placeholderMap)) {
    const regex = new RegExp(`\\{\\{crm\\.${key}\\}\\}`, 'gi');
    result = result.replace(regex, value || '');
  }

  return result;
}

/**
 * Flatten CRM placeholders into a dot-notation map
 */
export function flattenCRMPlaceholders(
  crmData: CRMPlaceholders,
): Record<string, string> {
  const result: Record<string, string> = {};

  if (crmData.account) {
    for (const [key, value] of Object.entries(crmData.account)) {
      if (value !== undefined && value !== null) {
        result[`account.${key}`] = String(value);
      }
    }
  }

  if (crmData.contact) {
    for (const [key, value] of Object.entries(crmData.contact)) {
      if (value !== undefined && value !== null) {
        result[`contact.${key}`] = String(value);
      }
    }
  }

  if (crmData.opportunity) {
    for (const [key, value] of Object.entries(crmData.opportunity)) {
      if (value !== undefined && value !== null) {
        result[`opportunity.${key}`] = String(value);
      }
    }
  }

  return result;
}

/**
 * Get available CRM placeholders for an entity
 */
export function getAvailablePlaceholders(): {
  account: string[];
  contact: string[];
  opportunity: string[];
} {
  return {
    account: [
      '{{crm.account.name}}',
      '{{crm.account.website}}',
      '{{crm.account.phone}}',
      '{{crm.account.industry}}',
      '{{crm.account.type}}',
      '{{crm.account.employeeCount}}',
      '{{crm.account.annualRevenue}}',
      '{{crm.account.healthScore}}',
      '{{crm.account.engagementScore}}',
      '{{crm.account.ownerName}}',
      '{{crm.account.ownerEmail}}',
    ],
    contact: [
      '{{crm.contact.firstName}}',
      '{{crm.contact.lastName}}',
      '{{crm.contact.fullName}}',
      '{{crm.contact.email}}',
      '{{crm.contact.phone}}',
      '{{crm.contact.mobile}}',
      '{{crm.contact.jobTitle}}',
      '{{crm.contact.department}}',
      '{{crm.contact.lifecycle}}',
    ],
    opportunity: [
      '{{crm.opportunity.name}}',
      '{{crm.opportunity.description}}',
      '{{crm.opportunity.amount}}',
      '{{crm.opportunity.amountFormatted}}',
      '{{crm.opportunity.probability}}',
      '{{crm.opportunity.weightedAmount}}',
      '{{crm.opportunity.currency}}',
      '{{crm.opportunity.status}}',
      '{{crm.opportunity.stageName}}',
      '{{crm.opportunity.expectedCloseDate}}',
      '{{crm.opportunity.ownerName}}',
      '{{crm.opportunity.ownerEmail}}',
    ],
  };
}

/**
 * Extract CRM placeholder keys from text
 */
export function extractCRMPlaceholders(text: string): string[] {
  const regex = /\{\{crm\.([a-zA-Z.]+)\}\}/g;
  const matches = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }

  return [...new Set(matches)];
}

// ============================================================================
// CONTEXT ENRICHMENT
// ============================================================================

/**
 * Build CRM context for AI prompts
 */
export function buildCRMContext(crmData: CRMPlaceholders): string {
  const sections: string[] = [];

  if (crmData.account) {
    sections.push(`Company Information:
- Company Name: ${crmData.account.name}
- Industry: ${crmData.account.industry || 'Not specified'}
- Type: ${crmData.account.type}
- Health Score: ${crmData.account.healthScore || 'N/A'}/100
${crmData.account.website ? `- Website: ${crmData.account.website}` : ''}`);
  }

  if (crmData.contact) {
    sections.push(`Contact Information:
- Name: ${crmData.contact.fullName}
- Title: ${crmData.contact.jobTitle || 'Not specified'}
- Department: ${crmData.contact.department || 'Not specified'}
- Lifecycle Stage: ${crmData.contact.lifecycle}`);
  }

  if (crmData.opportunity) {
    sections.push(`Opportunity Details:
- Deal Name: ${crmData.opportunity.name}
- Amount: ${crmData.opportunity.amountFormatted || 'Not specified'}
- Stage: ${crmData.opportunity.stageName || 'Unknown'}
- Probability: ${crmData.opportunity.probability || 'N/A'}%
- Expected Close: ${crmData.opportunity.expectedCloseDate || 'Not set'}`);
  }

  if (sections.length === 0) {
    return '';
  }

  return `\n\nCRM Context (use this information to personalize the content):\n${sections.join('\n\n')}`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(
  amount: Decimal | number | string,
  currency = 'USD',
): string {
  const numAmount =
    typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
