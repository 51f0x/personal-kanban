/**
 * Centralized API client that automatically adds Authorization header
 * to all requests using the stored JWT token
 */

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Get the stored authentication token
 */
function getAuthToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Make an authenticated API request with automatic token injection
 */
export async function apiRequest<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const token = getAuthToken();

    // Build headers
    const headers = new Headers(options.headers);

    // Set Content-Type if not already set and body exists
    if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    // Add Authorization header if token exists (unless explicitly disabled)
    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // Always include credentials for session-based auth
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({
            message: `Request failed with status ${response.status}`,
        }));
        throw new Error(error.message || `Request failed (${response.status})`);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
        return response.json();
    }

    return response.text() as unknown as T;
}

/**
 * GET request helper
 */
export async function apiGet<T = unknown>(endpoint: string): Promise<T> {
    return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
): Promise<T> {
    return apiRequest<T>(endpoint, {
        ...options,
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
    });
}

/**
 * PATCH request helper
 */
export async function apiPatch<T = unknown>(endpoint: string, body?: unknown): Promise<T> {
    return apiRequest<T>(endpoint, {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
    });
}

/**
 * PUT request helper
 */
export async function apiPut<T = unknown>(endpoint: string, body?: unknown): Promise<T> {
    return apiRequest<T>(endpoint, {
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
    });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = unknown>(endpoint: string): Promise<T> {
    return apiRequest<T>(endpoint, { method: 'DELETE' });
}
