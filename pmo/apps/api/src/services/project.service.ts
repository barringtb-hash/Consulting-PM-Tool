import { ProjectStatus, Prisma } from '@prisma/client';

import prisma from '../prisma/client';
import {
  ProjectCreateInput,
  ProjectUpdateInput,
} from '../validation/project.schema';

export interface ListProjectsParams {
  ownerId: number;
  clientId?: number;
  status?: ProjectStatus;
}

export const listProjects = async ({
  ownerId,
  clientId,
  status,
}: ListProjectsParams) => {
  const where: Prisma.ProjectWhereInput = {
    ownerId,
    clientId,
    status,
  };

  return prisma.project.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
};

export const getProjectById = async (id: number) =>
  prisma.project.findUnique({ where: { id } });

export const createProject = async (
  ownerId: number,
  data: ProjectCreateInput,
) =>
  prisma.project.create({
    data: {
      ...data,
      ownerId,
    },
  });

export const updateProject = async (id: number, data: ProjectUpdateInput) =>
  prisma.project.update({
    where: { id },
    data,
  });

export const deleteProject = async (id: number) =>
  prisma.project.delete({
    where: { id },
  });
