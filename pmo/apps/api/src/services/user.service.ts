import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client';
import type { UserRole } from '@prisma/client';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  timezone: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  timezone?: string;
  role?: UserRole;
}

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  timezone: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new user with hashed password
 * @throws Error if email already exists or validation fails
 */
export async function createUser(input: CreateUserInput): Promise<SafeUser> {
  const bcryptSaltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? '10');

  if (Number.isNaN(bcryptSaltRounds)) {
    throw new Error('BCRYPT_SALT_ROUNDS must be a valid number');
  }

  // Normalize email to lowercase for consistent storage and comparison
  const normalizedEmail = input.email.trim().toLowerCase();

  // 1) Enforce email uniqueness (case-insensitive)
  const existing = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
  });

  if (existing) {
    throw new Error('Email already in use');
  }

  // 2) Hash password
  const passwordHash = await bcrypt.hash(input.password, bcryptSaltRounds);

  // 3) Create user via Prisma (store normalized email)
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: normalizedEmail,
      passwordHash,
      timezone: input.timezone,
      role: input.role ?? 'USER',
    },
  });

  // 4) Never return passwordHash
  return sanitizeUser(user);
}

/**
 * Get all users (without password hashes)
 */
export async function getAllUsers(): Promise<SafeUser[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return users.map(sanitizeUser);
}

/**
 * Get user by ID (without password hash)
 */
export async function getUserById(id: number): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    return null;
  }

  return sanitizeUser(user);
}

/**
 * Update user by ID
 * @throws Error if user not found or email already in use
 */
export async function updateUser(
  id: number,
  input: UpdateUserInput,
): Promise<SafeUser> {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  // If email is being updated, normalize and check if it's already in use by another user
  let normalizedEmail: string | undefined;
  if (input.email) {
    normalizedEmail = input.email.trim().toLowerCase();

    if (normalizedEmail !== existingUser.email.toLowerCase()) {
      const emailInUse = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      });

      if (emailInUse) {
        throw new Error('Email already in use');
      }
    }
  }

  // Hash password if it's being updated
  let passwordHash: string | undefined;
  if (input.password) {
    const bcryptSaltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? '10');

    if (Number.isNaN(bcryptSaltRounds)) {
      throw new Error('BCRYPT_SALT_ROUNDS must be a valid number');
    }

    passwordHash = await bcrypt.hash(input.password, bcryptSaltRounds);
  }

  // Update user (store normalized email)
  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(normalizedEmail && { email: normalizedEmail }),
      ...(passwordHash && { passwordHash }),
      ...(input.timezone && { timezone: input.timezone }),
      ...(input.role && { role: input.role }),
    },
  });

  return sanitizeUser(user);
}

/**
 * Delete user by ID
 * @throws Error if user not found
 */
export async function deleteUser(id: number): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new Error('User not found');
  }

  await prisma.user.delete({
    where: { id },
  });
}

/**
 * Remove passwordHash from user object
 */
function sanitizeUser(user: {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  timezone: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}
