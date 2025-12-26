/**
 * Centralized API client that automatically adds Authorization header
 * to all requests using the stored JWT token
 */

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";
const AUTH_TOKEN_KEY = "auth_token";
const AUTH_REFRESH_TOKEN_KEY = "auth_refresh_token";

/**
 * Get the stored authentication token
 */
function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Get the stored refresh token
 */
function getRefreshToken(): string | null {
  return localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
}

/**
 * Persist new token pair
 */
function storeTokenPair(accessToken?: string, refreshToken?: string) {
  if (accessToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
  }
}

/**
 * Clear all auth tokens
 */
function clearTokens() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
}

/**
 * Make an authenticated API request with automatic token injection
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  async function performRequest(): Promise<Response> {
    const token = getAuthToken();

    // Build headers
    const headers = new Headers(options.headers);

    // Set Content-Type if not already set and body exists
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    // Add Authorization header if token exists (unless explicitly disabled)
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // Always include credentials for session-based auth
    return fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });
  }

  async function tryRefreshToken(): Promise<boolean> {
    const currentRefreshToken = getRefreshToken();
    const currentAccessToken = getAuthToken();

    if (!currentRefreshToken || !currentAccessToken) {
      return false;
    }

    // Call refresh endpoint directly to avoid recursion into apiRequest
    const headers = new Headers({
      "Content-Type": "application/json",
      Authorization: `Bearer ${currentAccessToken}`,
    });

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return false;
    }

    const data = (await response.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };

    if (!data.accessToken) {
      clearTokens();
      return false;
    }

    storeTokenPair(data.accessToken, data.refreshToken);
    return true;
  }

  // First attempt with current token
  let response = await performRequest();

  // If unauthorized, try to refresh token once and retry
  if (response.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      response = await performRequest();
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `Request failed with status ${response.status}`,
    }));
    throw new Error(error.message || `Request failed (${response.status})`);
  }

  // Handle empty responses
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json();
  }

  return response.text() as unknown as T;
}

/**
 * GET request helper
 */
export async function apiGet<T = unknown>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: "GET" });
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
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request helper
 */
export async function apiPatch<T = unknown>(
  endpoint: string,
  body?: unknown,
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request helper
 */
export async function apiPut<T = unknown>(
  endpoint: string,
  body?: unknown,
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = unknown>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: "DELETE" });
}
