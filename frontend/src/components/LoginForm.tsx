import React, { useState } from 'react';
import { Button } from './ui/button';
import { loginLocal } from '../lib/serverAuth';
import { toastSuccess, toastError } from './ui/toast';
import { useNavigate } from 'react-router-dom';

type Props = {
  onSuccess?: (role: string) => void;
  onCancel?: () => void;
};

const LoginForm: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const [role, setRole] = useState<string>('user');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const resp = await loginLocal(email, password);
      toastSuccess('Logged in');
      const lastRoute = resp?.session?.last_route ?? '/';
      setLoading(false);
      onSuccess?.(resp?.user?.role ?? 'user');
      navigate(lastRoute);
    } catch (err: any) {
      // Log the full error to console for debugging (network/CORS/preflight issues)
      console.error('Login error:', err);
      // err is expected to be an Error with optional `body` and `status` properties
      const msg = err?.body?.error ?? err?.body?.message ?? err?.message ?? (typeof err === 'string' ? err : `Login failed (${err?.status ?? 'error'})`);
      toastError(String(msg));
      setLoading(false);
    }
  };

  return (
    <div className="bg-card text-foreground rounded-md shadow-sm p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-sm text-muted-foreground">Log in with your account.</div>

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 bg-transparent text-foreground"
            type="email"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-input px-3 py-2 bg-transparent text-foreground"
            type="password"
            required
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Logging...' : 'Login'}</Button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
