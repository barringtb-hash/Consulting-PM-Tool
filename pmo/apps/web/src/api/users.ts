import { buildApiUrl } from './config';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  timezone: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  timezone: string;
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
