const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
export async function fetchUsers() {
    const response = await fetch(`${API_URL}/users`);
    if (!response.ok) {
        throw new Error('Failed to load users');
    }
    return response.json();
}
export async function registerUser(payload) {
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
//# sourceMappingURL=users.js.map