import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  timezone: string;
}

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  timezone: string;
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

  // 1) Enforce email uniqueness
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new Error('Email already in use');
  }

  // 2) Hash password
  const passwordHash = await bcrypt.hash(input.password, bcryptSaltRounds);

  // 3) Create user via Prisma
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      timezone: input.timezone,
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
 * Remove passwordHash from user object
 */
function sanitizeUser(user: {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}
