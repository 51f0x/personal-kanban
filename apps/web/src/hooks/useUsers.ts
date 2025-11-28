import { useCallback, useEffect, useState } from 'react';
import { fetchUsers, registerUser, type RegisterUserPayload, type User } from '../api/users';

const DEFAULT_OWNER_ID = import.meta.env.VITE_OWNER_ID ?? '';

export function useUsers(initialOwnerId = DEFAULT_OWNER_ID) {
  const [users, setUsers] = useState<User[]>([]);
  const [ownerId, setOwnerId] = useState(initialOwnerId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers();
      setUsers(data);
      if (!ownerId && data.length) {
        setOwnerId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load users');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const createUser = useCallback(async (payload: RegisterUserPayload) => {
    const user = await registerUser(payload);
    setUsers((prev) => [...prev, user]);
    setOwnerId(user.id);
    return user;
  }, []);

  return {
    users,
    ownerId,
    setOwnerId,
    loading,
    error,
    createUser,
    refresh: loadUsers,
  } as const;
}
