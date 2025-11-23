import { buildApiUrl } from './config';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  timezone: string;
  role?: 'USER' | 'ADMIN';
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  timezone?: string;
  role?: 'USER' | 'ADMIN';
}

export interface User {
  id: number;
  name: string;
  email: string;
  timezone: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  const response = await fetch(buildApiUrl('/users'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Failed to create user',
    }));
    throw new Error(error.error || 'Failed to create user');
  }

  return response.json();
}

/**
 * Get all users
 */
export async function getAllUsers(): Promise<User[]> {
  const response = await fetch(buildApiUrl('/users'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Failed to fetch users',
    }));
    throw new Error(error.error || 'Failed to fetch users');
  }

  return response.json();
}

/**
 * Get a user by ID
 */
export async function getUserById(id: number): Promise<User> {
  const response = await fetch(buildApiUrl(`/users/${id}`), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Failed to fetch user',
    }));
    throw new Error(error.error || 'Failed to fetch user');
  }

  return response.json();
}

/**
 * Update a user
 */
export async function updateUser(
  id: number,
  input: UpdateUserInput,
): Promise<User> {
  const response = await fetch(buildApiUrl(`/users/${id}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Failed to update user',
    }));
    throw new Error(error.error || 'Failed to update user');
  }

  return response.json();
}

/**
 * Delete a user
 */
export async function deleteUser(id: number): Promise<void> {
  const response = await fetch(buildApiUrl(`/users/${id}`), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Failed to delete user',
    }));
    throw new Error(error.error || 'Failed to delete user');
  }
}
