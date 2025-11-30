import { FormEvent, useState } from 'react';
import type { User } from '../../services/users';
import { NativeSelect } from '@/components/base/select/select-native';
import { Input } from '@/components/base/input/input';
import { Button } from '@/components/base/buttons/button';

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
    <div className="flex flex-col gap-3">
      <NativeSelect
        label="Owner"
        value={ownerId}
        onChange={(e) => setOwnerId(e.target.value)}
        disabled={loading}
        options={[
          { label: 'Select existing owner', value: '' },
          ...users.map((user) => ({
            label: `${user.name} · ${user.email}`,
            value: user.id,
          })),
        ]}
      />
      <Button 
        size="sm"
        color="secondary"
        onClick={() => setShowForm((prev) => !prev)}
      >
        {showForm ? 'Hide registration' : 'Register new user'}
      </Button>
      {showForm && (
        <form className="flex flex-col gap-3 mt-3 p-5 rounded-xl border border-gray-600/30 bg-gray-800/50 backdrop-blur-sm" onSubmit={handleSubmit}>
          <Input
            label="Name"
            value={name}
            onChange={(value: string) => setName(value)}
            required
            size="sm"
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(value: string) => setEmail(value)}
            required
            size="sm"
          />
          <Input
            label="Timezone"
            value={timezone}
            onChange={(value: string) => setTimezone(value)}
            placeholder="UTC"
            size="sm"
          />
          <Button 
            type="submit"
            size="md"
            color="primary"
            isDisabled={submitting}
            isLoading={submitting}
          >
            {submitting ? 'Registering...' : 'Register & select'}
          </Button>
          {error && <p className="text-gray-400 text-sm">{error}</p>}
        </form>
      )}
    </div>
  );
}
