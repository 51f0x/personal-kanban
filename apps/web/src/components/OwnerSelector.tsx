import { FormEvent, useState } from 'react';
import type { User } from '../api/users';

interface Props {
  users: User[];
  ownerId: string;
  setOwnerId: (id: string) => void;
  onRegister: (payload: { name: string; email: string; timezone?: string }) => Promise<void>;
  loading?: boolean;
}

export function OwnerSelector({ users, ownerId, setOwnerId, onRegister, loading }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onRegister({ name, email, timezone: timezone || undefined });
      setName('');
      setEmail('');
      setTimezone('');
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="owner-panel">
      <label>
        Owner
        <select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} disabled={loading}>
          <option value="">Select existing owner</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} · {user.email}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={() => setShowForm((prev) => !prev)}>
        {showForm ? 'Hide registration' : 'Register new user'}
      </button>
      {showForm && (
        <form className="owner-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Timezone
            <input value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="UTC" />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Registering...' : 'Register & select'}
          </button>
          {error && <p className="muted">{error}</p>}
        </form>
      )}
    </div>
  );
}
