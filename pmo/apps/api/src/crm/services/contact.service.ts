/**
 * Contact Service
 *
 * Business logic for CRMContact management.
 * CRMContacts represent individual people associated with Accounts.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { getTenantId } from '../../tenant/tenant.context';
import { createChildLogger } from '../../utils/logger';

const log = createChildLogger({ module: 'contact-service' });

// ============================================================================
// TYPES
// ============================================================================

export interface CreateContactInput {
  accountId?: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  department?: string;
  lifecycle?: 'LEAD' | 'MQL' | 'SQL' | 'OPPORTUNITY' | 'CUSTOMER' | 'EVANGELIST' | 'CHURNED';
  leadSource?: 'WEBSITE' | 'REFERRAL' | 'LINKEDIN' | 'COLD_CALL' | 'EMAIL' | 'EVENT' | 'PARTNER' | 'OTHER';
  isPrimary?: boolean;
  doNotContact?: boolean;
  linkedinUrl?: string;
  twitterUrl?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  ownerId?: number;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface UpdateContactInput {
  accountId?: number | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  department?: string;
  lifecycle?: 'LEAD' | 'MQL' | 'SQL' | 'OPPORTUNITY' | 'CUSTOMER' | 'EVANGELIST' | 'CHURNED';
  leadSource?: 'WEBSITE' | 'REFERRAL' | 'LINKEDIN' | 'COLD_CALL' | 'EMAIL' | 'EVENT' | 'PARTNER' | 'OTHER';
  leadScore?: number;
  isPrimary?: boolean;
  doNotContact?: boolean;
  linkedinUrl?: string;
  twitterUrl?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  ownerId?: number | null;
  tags?: string[];
  customFields?: Record<string, unknown>;
  archived?: boolean;
}

export interface ContactFilters {
  accountId?: number;
  lifecycle?: string;
  leadSource?: string;
  ownerId?: number;
  archived?: boolean;
  search?: string;
  tags?: string[];
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Create a new contact.
 */
export async function createContact(input: CreateContactInput) {
  const tenantId = getTenantId();

  const contact = await prisma.cRMContact.create({
    data: {
      tenantId,
      accountId: input.accountId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      mobile: input.mobile,
      jobTitle: input.jobTitle,
      department: input.department,
      lifecycle: input.lifecycle || 'LEAD',
      leadSource: input.leadSource,
      isPrimary: input.isPrimary || false,
      doNotContact: input.doNotContact || false,
      linkedinUrl: input.linkedinUrl,
      twitterUrl: input.twitterUrl,
      address: input.address as Prisma.InputJsonValue,
      ownerId: input.ownerId,
      tags: input.tags || [],
      customFields: input.customFields as Prisma.InputJsonValue,
    },
    include: {
      account: {
        select: { id: true, name: true },
      },
      owner: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  log.info({ contactId: contact.id }, 'Contact created');
  return contact;
}

/**
 * Get contact by ID.
 */
export async function getContactById(id: number) {
  const tenantId = getTenantId();

  return prisma.cRMContact.findFirst({
    where: { id, tenantId },
    include: {
      account: {
        select: { id: true, name: true, type: true },
      },
      owner: {
        select: { id: true, name: true, email: true },
      },
      opportunityContacts: {
        include: {
          opportunity: {
            select: {
              id: true,
              name: true,
              status: true,
              amount: true,
              stage: { select: { name: true, color: true } },
            },
          },
        },
      },
      activities: {
        where: { tenantId },
        orderBy: { scheduledAt: 'desc' },
        take: 10,
        select: {
          id: true,
          type: true,
          subject: true,
          status: true,
          scheduledAt: true,
        },
      },
      _count: {
        select: {
          opportunityContacts: true,
          activities: true,
        },
      },
    },
  });
}

/**
 * List contacts with filtering and pagination.
 */
export async function listContacts(
  filters: ContactFilters = {},
  pagination: PaginationOptions = {},
) {
  const tenantId = getTenantId();
  const page = pagination.page || 1;
  const limit = Math.min(pagination.limit || 50, 100);
  const skip = (page - 1) * limit;
  const sortBy = pagination.sortBy || 'createdAt';
  const sortOrder = pagination.sortOrder || 'desc';

  // Build where clause
  const where: Prisma.CRMContactWhereInput = {
    tenantId,
    archived: filters.archived ?? false,
  };

  if (filters.accountId) {
    where.accountId = filters.accountId;
  }

  if (filters.lifecycle) {
    where.lifecycle = filters.lifecycle as Prisma.EnumContactLifecycleFilter;
  }

  if (filters.leadSource) {
    where.leadSource = filters.leadSource as Prisma.EnumCRMLeadSourceNullableFilter;
  }

  if (filters.ownerId) {
    where.ownerId = filters.ownerId;
  }

  if (filters.tags && filters.tags.length > 0) {
    where.tags = { hasSome: filters.tags };
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    where.OR = [
      { firstName: { contains: searchLower, mode: 'insensitive' } },
      { lastName: { contains: searchLower, mode: 'insensitive' } },
      { email: { contains: searchLower, mode: 'insensitive' } },
      { jobTitle: { contains: searchLower, mode: 'insensitive' } },
    ];
  }

  // Build order by
  const orderBy: Prisma.CRMContactOrderByWithRelationInput = {};
  if (sortBy === 'name') {
    orderBy.lastName = sortOrder;
  } else {
    (orderBy as Record<string, string>)[sortBy] = sortOrder;
  }

  const [contacts, total] = await Promise.all([
    prisma.cRMContact.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        account: {
          select: { id: true, name: true },
        },
        owner: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            opportunityContacts: true,
            activities: true,
          },
        },
      },
    }),
    prisma.cRMContact.count({ where }),
  ]);

  return {
    contacts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * List contacts for a specific account.
 */
export async function listContactsByAccount(accountId: number) {
  const tenantId = getTenantId();

  return prisma.cRMContact.findMany({
    where: {
      tenantId,
      accountId,
      archived: false,
    },
    orderBy: [{ isPrimary: 'desc' }, { lastName: 'asc' }],
    include: {
      owner: {
        select: { id: true, name: true },
      },
    },
  });
}

/**
 * Update a contact.
 */
export async function updateContact(id: number, input: UpdateContactInput) {
  const tenantId = getTenantId();

  // Verify contact exists and belongs to tenant
  const existing = await prisma.cRMContact.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Contact not found');
  }

  const contact = await prisma.cRMContact.update({
    where: { id },
    data: {
      accountId: input.accountId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      mobile: input.mobile,
      jobTitle: input.jobTitle,
      department: input.department,
      lifecycle: input.lifecycle,
      leadSource: input.leadSource,
      leadScore: input.leadScore,
      isPrimary: input.isPrimary,
      doNotContact: input.doNotContact,
      linkedinUrl: input.linkedinUrl,
      twitterUrl: input.twitterUrl,
      address: input.address !== undefined ? (input.address as Prisma.InputJsonValue) : undefined,
      ownerId: input.ownerId,
      tags: input.tags,
      customFields: input.customFields !== undefined ? (input.customFields as Prisma.InputJsonValue) : undefined,
      archived: input.archived,
    },
    include: {
      account: {
        select: { id: true, name: true },
      },
      owner: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  log.info({ contactId: id }, 'Contact updated');
  return contact;
}

/**
 * Delete a contact (soft delete by archiving).
 */
export async function deleteContact(id: number) {
  const tenantId = getTenantId();

  // Verify contact exists and belongs to tenant
  const existing = await prisma.cRMContact.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Contact not found');
  }

  await prisma.cRMContact.update({
    where: { id },
    data: { archived: true },
  });

  log.info({ contactId: id }, 'Contact archived');
  return { success: true };
}

/**
 * Restore an archived contact.
 */
export async function restoreContact(id: number) {
  const tenantId = getTenantId();

  const contact = await prisma.cRMContact.findFirst({
    where: { id, tenantId, archived: true },
  });

  if (!contact) {
    throw new Error('Archived contact not found');
  }

  const restored = await prisma.cRMContact.update({
    where: { id },
    data: { archived: false },
    include: {
      account: {
        select: { id: true, name: true },
      },
      owner: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  log.info({ contactId: id }, 'Contact restored');
  return restored;
}

/**
 * Get contact statistics.
 */
export async function getContactStats() {
  const tenantId = getTenantId();

  const [total, byLifecycle, bySource, recentContacts] = await Promise.all([
    prisma.cRMContact.count({
      where: { tenantId, archived: false },
    }),
    prisma.cRMContact.groupBy({
      by: ['lifecycle'],
      where: { tenantId, archived: false },
      _count: { id: true },
    }),
    prisma.cRMContact.groupBy({
      by: ['leadSource'],
      where: { tenantId, archived: false, leadSource: { not: null } },
      _count: { id: true },
    }),
    prisma.cRMContact.count({
      where: {
        tenantId,
        archived: false,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return {
    total,
    recentContacts,
    byLifecycle: byLifecycle.map((g) => ({
      lifecycle: g.lifecycle,
      count: g._count.id,
    })),
    bySource: bySource.map((g) => ({
      source: g.leadSource,
      count: g._count.id,
    })),
  };
}
