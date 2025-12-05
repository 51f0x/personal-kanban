import { apiPost, apiGet } from './api';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    timezone?: string;
    defaultBoardId?: string | null;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface SignUpCredentials {
    email: string;
    name: string;
    password: string;
    timezone?: string;
}

/**
 * Check if user is authenticated by verifying token exists
 */
export function isAuthenticated(): boolean {
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Get current authenticated user from storage
 */
export function getCurrentUser(): AuthUser | null {
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    if (!userStr) return null;
    try {
        return JSON.parse(userStr) as AuthUser;
    } catch {
        return null;
    }
}

/**
 * Get authentication token
 */
export function getAuthToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Login user and store credentials
 */
export async function login(credentials: LoginCredentials): Promise<AuthUser> {
    // Use direct fetch for login since we don't have a token yet
    const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for session-based auth
        body: JSON.stringify(credentials),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();

    // Store accessToken for JWT auth (this will be used by apiRequest for all subsequent requests)
    if (data.accessToken) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken);
    }

    // Store user data
    if (data.user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
        return data.user;
    }

    // If no user in response, try to fetch current user
    const user = await getCurrentUserFromAPI();
    if (user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        return user;
    }

    throw new Error('Login successful but user data not available');
}

/**
 * Get current user from API
 */
async function getCurrentUserFromAPI(): Promise<AuthUser | null> {
    try {
        return await apiGet<AuthUser>('/auth/me');
    } catch {
        return null;
    }
}

/**
 * Logout user and clear credentials
 */
export async function logout(): Promise<void> {
    try {
        await apiPost('/auth/logout');
    } catch {
        // Ignore errors during logout
    } finally {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
    }
}

/**
 * Sign up a new user, set password, and auto-login
 */
export async function signup(credentials: SignUpCredentials): Promise<AuthUser> {
    const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

    // Step 1: Register the user with password (no auth needed)
    const registerResponse = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            email: credentials.email,
            name: credentials.name,
            password: credentials.password,
            timezone: credentials.timezone,
        }),
    });

    if (!registerResponse.ok) {
        const error = await registerResponse
            .json()
            .catch(() => ({ message: 'Registration failed' }));
        throw new Error(error.message || 'Registration failed');
    }

    // Step 2: Auto-login with the credentials (no auth needed yet)
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
        }),
    });

    if (!loginResponse.ok) {
        const error = await loginResponse.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(
            error.message || 'Registration successful but login failed. Please try logging in.',
        );
    }

    const loginData = await loginResponse.json();

    // Store accessToken for JWT auth (this will be used by apiRequest for all subsequent requests)
    if (loginData.accessToken) {
        localStorage.setItem(AUTH_TOKEN_KEY, loginData.accessToken);
    }

    // Store user data
    if (loginData.user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(loginData.user));
        return loginData.user;
    }

    throw new Error('Registration successful but user data not available');
}

/**
 * Verify current session is still valid
 */
export async function verifySession(): Promise<boolean> {
    if (!isAuthenticated()) {
        return false;
    }

    try {
        const user = await apiGet<AuthUser>('/auth/me');
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        return true;
    } catch {
        // Session invalid or network error, clear auth
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        return false;
    }
}
