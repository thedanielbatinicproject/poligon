import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import Dialog from './ui/dialog';
import AppToaster, { toastSuccess } from './ui/toast';
import { getRoleFromCookie } from '../lib/auth';

const Header: React.FC = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const [role, setRole] = useState<string>('visitor');

  useEffect(() => {
    const r = getRoleFromCookie() || 'visitor';
    setRole(r);
  }, []);

  const links = [
    { to: '/', label: 'Home', show: true },
    { to: '/profile', label: 'Profile', show: ['user', 'student', 'mentor', 'admin'].includes(role) },
    { to: '/documents', label: 'Documents', show: ['user', 'student', 'mentor', 'admin'].includes(role) },
    { to: '/files', label: 'Files', show: ['user', 'student', 'mentor', 'admin'].includes(role) },
    { to: '/tasks', label: 'Tasks', show: ['user', 'student', 'mentor', 'admin'].includes(role) },
    { to: '/mentor', label: 'Mentor', show: role === 'mentor' },
    { to: '/admin', label: 'Admin', show: role === 'admin' },
  ];

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg">Poligon</Link>
          <div className="flex items-center gap-4">
            {links.filter(l => l.show).map((l) => (
              <Link key={l.to} to={l.to}>{l.label}</Link>
            ))}
            <Button variant="outline" onClick={() => setAuthOpen(true)}>Login</Button>
          </div>
        </nav>
      </header>

      <Dialog isOpen={authOpen} onClose={() => setAuthOpen(false)} title="Login">
        <p className="mb-4">Demo login modal. Click confirm to toast success.</p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setAuthOpen(false)}>Cancel</Button>
          <Button onClick={() => { toastSuccess('Logged in (demo)'); setAuthOpen(false); }}>Confirm</Button>
        </div>
      </Dialog>

      <AppToaster />
    </>
  );
};

export default Header;
