import type { Board } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export interface User {
  id: string;
  email: string;
  name: string;
  timezone?: string;
  boards?: Board[];
}

export interface RegisterUserPayload {
  email: string;
  name: string;
  timezone?: string;
}

export async function fetchUsers(): Promise<User[]> {
  const response = await fetch(`${API_URL}/users`);
  if (!response.ok) {
    throw new Error('Failed to load users');
  }
  return response.json();
}

export async function registerUser(payload: RegisterUserPayload): Promise<User> {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to register user');
  }
  return response.json();
}
