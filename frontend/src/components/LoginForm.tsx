import React, { useState } from 'react';
import { Button } from './ui/button';
import { setRoleCookie } from '../lib/auth';
import { toastSuccess } from './ui/toast';

type Props = {
  onSuccess?: (role: string) => void;
  onCancel?: () => void;
};

const LoginForm: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const [role, setRole] = useState<string>('user');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    // Simulate login; in a real app you'd call the backend here and get a session
    await new Promise((r) => setTimeout(r, 400));
    setRoleCookie(role);
    // notify other parts of the app about role change
    window.dispatchEvent(new CustomEvent('poligon:roleChanged', { detail: { role } }));
    toastSuccess('Logged in');
    setLoading(false);
    onSuccess?.(role);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-sm text-muted-foreground">This is a demo login. Choose a role to simulate login.</div>
      <div>
        <label className="block text-sm mb-1">Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-md border px-3 py-2">
          <option value="user">User</option>
          <option value="student">Student</option>
          <option value="mentor">Mentor</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Logging...' : 'Login'}</Button>
      </div>
    </form>
  );
};

export default LoginForm;
