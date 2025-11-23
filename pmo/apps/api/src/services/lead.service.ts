import { LeadSource, LeadStatus, Prisma, PipelineStage } from '@prisma/client';

import prisma from '../prisma/client';
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
}

export const listLeads = async ({
  search,
  source,
  status,
  ownerUserId,
}: ListLeadsParams) => {
  const where: Prisma.InboundLeadWhereInput = {
    source,
    status,
    ownerUserId,
  };

  if (search) {
    const searchFilter: Prisma.StringFilter = {
      contains: search,
      mode: 'insensitive',
    };
    where.OR = [
      { name: searchFilter },
      { email: searchFilter },
      { company: searchFilter },
      { message: searchFilter },
    ];
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
  return prisma.inboundLead.findUnique({
    where: { id },
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

export const createLead = async (data: LeadCreateInput) =>
  prisma.inboundLead.create({
    data,
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

export const createPublicLead = async (data: PublicLeadCreateInput) =>
  prisma.inboundLead.create({
    data: {
      ...data,
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

export const updateLead = async (id: number, data: LeadUpdateInput) => {
  const existing = await prisma.inboundLead.findUnique({ where: { id } });

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
  const lead = await prisma.inboundLead.findUnique({
    where: { id },
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
      const project = await tx.project.create({
        data: {
          clientId,
          ownerId: lead.ownerUserId || 1, // Default to first user if no owner
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
  const existing = await prisma.inboundLead.findUnique({ where: { id } });

  if (!existing) {
    return null;
  }

  return prisma.inboundLead.delete({
    where: { id },
  });
};
