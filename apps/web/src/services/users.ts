import { apiGet, apiPost } from './api';
import type { Board } from './types';

export interface User {
    id: string;
    email: string;
    name: string;
    timezone?: string;
    boards?: Board[];
    passwordHash?: string;
}

export interface RegisterUserPayload {
    email: string;
    name: string;
    timezone?: string;
}

export async function fetchUsers(): Promise<User[]> {
    return apiGet<User[]>('/users');
}

export async function registerUser(payload: RegisterUserPayload): Promise<User> {
    return apiPost<User>('/users', payload);
}
