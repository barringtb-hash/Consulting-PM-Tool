import { ProjectRole, Prisma } from '@prisma/client';

import prisma from '../prisma/client';
import { getTenantId, hasTenantContext } from '../tenant/tenant.context';
import {
  ProjectMemberAddInput,
  ProjectMemberUpdateInput,
} from '../validation/project.schema';

/**
 * Get all members of a project including their user information.
 */
export const getProjectMembers = async (projectId: number) => {
  return prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      addedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { addedAt: 'asc' },
  });
};

/**
 * Get a specific project member by project and user ID.
 */
export const getProjectMember = async (projectId: number, userId: number) => {
  return prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

/**
 * Add a member to a project.
 */
export const addProjectMember = async (
  projectId: number,
  data: ProjectMemberAddInput,
  addedById?: number,
) => {
  return prisma.projectMember.create({
    data: {
      projectId,
      userId: data.userId,
      role: data.role,
      addedById,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

/**
 * Add multiple members to a project at once.
 */
export const addProjectMembersBulk = async (
  projectId: number,
  members: ProjectMemberAddInput[],
  addedById?: number,
) => {
  // Use transaction to ensure all-or-nothing
  return prisma.$transaction(
    members.map((member) =>
      prisma.projectMember.create({
        data: {
          projectId,
          userId: member.userId,
          role: member.role,
          addedById,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ),
  );
};

/**
 * Update a project member's role.
 */
export const updateProjectMemberRole = async (
  projectId: number,
  userId: number,
  data: ProjectMemberUpdateInput,
) => {
  try {
    return await prisma.projectMember.update({
      where: {
        projectId_userId: { projectId, userId },
      },
      data: {
        role: data.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return null;
    }
    throw error;
  }
};

/**
 * Remove a member from a project.
 */
export const removeProjectMember = async (
  projectId: number,
  userId: number,
) => {
  try {
    return await prisma.projectMember.delete({
      where: {
        projectId_userId: { projectId, userId },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return null;
    }
    throw error;
  }
};

/**
 * Get the role of a user in a project.
 * Returns null if user is not a member.
 */
export const getUserProjectRole = async (
  projectId: number,
  userId: number,
): Promise<ProjectRole | null> => {
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
    select: { role: true },
  });
  return membership?.role ?? null;
};

/**
 * Check if a user is a member of a project.
 */
export const isProjectMember = async (
  projectId: number,
  userId: number,
): Promise<boolean> => {
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
    select: { id: true },
  });
  return membership !== null;
};

/**
 * Get all projects where a user is a member (not owner).
 */
export const getUserProjectMemberships = async (userId: number) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  return prisma.projectMember.findMany({
    where: {
      userId,
      project: {
        tenantId,
      },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          status: true,
          visibility: true,
          ownerId: true,
        },
      },
    },
    orderBy: { addedAt: 'desc' },
  });
};

/**
 * Get tenant users for member selection dropdown.
 * Returns active users in the current tenant.
 */
export const getTenantUsersForSelection = async (search?: string) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  if (!tenantId) {
    return [];
  }

  const where: Prisma.TenantUserWhereInput = {
    tenantId,
    acceptedAt: { not: null }, // Only accepted members
  };

  // Get tenant users with user info
  const tenantUsers = await prisma.tenantUser.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      user: {
        name: 'asc',
      },
    },
  });

  // Filter by search term if provided
  let users = tenantUsers.map((tu) => ({
    id: tu.user.id,
    name: tu.user.name,
    email: tu.user.email,
    tenantRole: tu.role,
  }));

  if (search && search.trim()) {
    const searchLower = search.toLowerCase().trim();
    users = users.filter(
      (u) =>
        u.name.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower),
    );
  }

  return users;
};
