import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

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

export interface User {
  id: number;
  name: string;
  email: string;
  timezone: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  const response = await fetch(
    buildApiUrl('/users'),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );

  return handleResponse<User>(response);
}

/**
 * Get all users
 */
export async function getAllUsers(): Promise<User[]> {
  const response = await fetch(
    buildApiUrl('/users'),
    buildOptions({
      method: 'GET',
    }),
  );

  return handleResponse<User[]>(response);
}

/**
 * Get a user by ID
 */
export async function getUserById(id: number): Promise<User> {
  const response = await fetch(
    buildApiUrl(`/users/${id}`),
    buildOptions({
      method: 'GET',
    }),
  );

  return handleResponse<User>(response);
}

/**
 * Update a user
 */
export async function updateUser(
  id: number,
  input: UpdateUserInput,
): Promise<User> {
  const response = await fetch(
    buildApiUrl(`/users/${id}`),
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  );

  return handleResponse<User>(response);
}

/**
 * Delete a user
 */
export async function deleteUser(id: number): Promise<void> {
  const response = await fetch(
    buildApiUrl(`/users/${id}`),
    buildOptions({
      method: 'DELETE',
    }),
  );

  await handleResponse<void>(response);
}
