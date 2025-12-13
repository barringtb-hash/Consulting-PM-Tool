import { LeadSource, LeadStatus, Prisma, PipelineStage } from '@prisma/client';

import prisma from '../prisma/client';
import { getTenantId, hasTenantContext } from '../tenant/tenant.context';
import {
  LeadCreateInput,
  LeadUpdateInput,
  LeadConvertInput,
  PublicLeadCreateInput,
} from '../validation/lead.schema';

export interface ListLeadsParams {
  search?: string;
  source?: LeadSource;
  status?: LeadStatus;
  ownerUserId?: number;
  accessFilter?: { OR: Array<Record<string, unknown>> } | Record<string, never>;
}

export const listLeads = async ({
  search,
  source,
  status,
  ownerUserId,
  accessFilter,
}: ListLeadsParams) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const where: Prisma.InboundLeadWhereInput = {
    tenantId,
    source,
    status,
    ownerUserId,
  };

  // Apply access filter (authorization scoping)
  if (accessFilter && 'OR' in accessFilter) {
    where.AND = [accessFilter];
  }

  if (search) {
    const searchFilter: Prisma.StringFilter = {
      contains: search,
      mode: 'insensitive',
    };
    // If there's already an AND from access filter, add search to it
    if (where.AND) {
      (where.AND as Prisma.InboundLeadWhereInput[]).push({
        OR: [
          { name: searchFilter },
          { email: searchFilter },
          { company: searchFilter },
          { message: searchFilter },
        ],
      });
    } else {
      where.OR = [
        { name: searchFilter },
        { email: searchFilter },
        { company: searchFilter },
        { message: searchFilter },
      ];
    }
  }

  return prisma.inboundLead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      primaryContact: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

export const getLeadById = async (id: number) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  return prisma.inboundLead.findFirst({
    where: { id, tenantId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      client: true,
      primaryContact: true,
    },
  });
};

export const createLead = async (data: LeadCreateInput) => {
  // Get tenant context for multi-tenant isolation
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  return prisma.inboundLead.create({
    data: {
      ...data,
      tenantId,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

export const createPublicLead = async (data: PublicLeadCreateInput) => {
  // Get tenant context for multi-tenant isolation (if available)
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  return prisma.inboundLead.create({
    data: {
      ...data,
      tenantId,
      status: LeadStatus.NEW,
    },
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      serviceInterest: true,
      source: true,
      status: true,
      createdAt: true,
    },
  });
};

export const updateLead = async (id: number, data: LeadUpdateInput) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const existing = await prisma.inboundLead.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return null;
  }

  return prisma.inboundLead.update({
    where: { id },
    data,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      primaryContact: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

export const convertLead = async (id: number, conversion: LeadConvertInput) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const lead = await prisma.inboundLead.findFirst({
    where: { id, tenantId },
    include: { client: true, primaryContact: true },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  if (lead.status === LeadStatus.CONVERTED) {
    throw new Error('Lead already converted');
  }

  return prisma.$transaction(async (tx) => {
    let clientId = conversion.clientId || lead.clientId;
    let contactId = lead.primaryContactId;
    let projectId;

    // Create or use existing client
    if (conversion.createClient && !clientId && lead.company) {
      const client = await tx.client.create({
        data: {
          name: lead.company,
          notes: `Created from lead: ${lead.email}`,
        },
      });
      clientId = client.id;
    }

    // Create contact if requested and we have a client
    if (conversion.createContact && clientId && !contactId) {
      const contact = await tx.contact.create({
        data: {
          clientId,
          name: lead.name || lead.email,
          email: lead.email,
          role: conversion.contactRole,
          notes: `Created from lead`,
        },
      });
      contactId = contact.id;
    }

    // Create pipeline project if requested
    if (conversion.createProject && clientId) {
      // Determine the owner ID: use provided ownerId, fall back to lead's owner
      const projectOwnerId = conversion.ownerId || lead.ownerUserId;

      if (!projectOwnerId) {
        throw new Error(
          'Project owner not specified. Please provide an ownerId or ensure the lead has an assigned owner.',
        );
      }

      const project = await tx.project.create({
        data: {
          clientId,
          ownerId: projectOwnerId,
          name:
            conversion.projectName ||
            `${lead.company || lead.email} - ${lead.serviceInterest}`,
          status: 'PLANNING',
          pipelineStage:
            (conversion.pipelineStage as PipelineStage) ||
            PipelineStage.NEW_LEAD,
          pipelineValue: conversion.pipelineValue,
          leadSource: lead.source,
        },
      });
      projectId = project.id;
    }

    // Update lead to converted status
    const updatedLead = await tx.inboundLead.update({
      where: { id },
      data: {
        status: LeadStatus.CONVERTED,
        clientId,
        primaryContactId: contactId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: true,
        primaryContact: true,
      },
    });

    return {
      lead: updatedLead,
      clientId,
      contactId,
      projectId,
    };
  });
};

export const deleteLead = async (id: number) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const existing = await prisma.inboundLead.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return null;
  }

  return prisma.inboundLead.delete({
    where: { id },
  });
};
