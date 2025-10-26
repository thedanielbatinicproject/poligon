import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import Dialog from './ui/dialog';
import LoginForm from './LoginForm';
import AppToaster, { toastSuccess } from './ui/toast';
import { removeRoleCookie } from '../lib/auth';
import { getRoleFromCookie } from '../lib/auth';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from './ui/navigation-menu';
import { toggleTheme } from '../lib/theme';

const Header: React.FC = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const [role, setRole] = useState<string>('visitor');

  useEffect(() => {
    const r = getRoleFromCookie() || 'visitor';
    setRole(r);
  }, []);

  useEffect(() => {
    const onRole = (e: Event) => {
      // Custom event with detail.role
      // @ts-ignore
      const newRole = e?.detail?.role ?? getRoleFromCookie() ?? 'visitor';
      setRole(newRole);
    };
    window.addEventListener('poligon:roleChanged', onRole as EventListener);
    return () => window.removeEventListener('poligon:roleChanged', onRole as EventListener);
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

  const isAuthenticated = ['user', 'student', 'mentor', 'admin'].includes(role);

  const handleLogout = () => {
    removeRoleCookie();
    window.dispatchEvent(new CustomEvent('poligon:roleChanged', { detail: { role: 'visitor' } }));
    toastSuccess('Logged out');
  };

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <nav className="container mx-auto px-4 py-3 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <Link to="/" className="font-bold text-lg">Poligon</Link>

            <div className="flex items-center gap-4">
              <NavigationMenu>
                <NavigationMenuList>
                  {links.filter(l => l.show).map((l) => (
                    <NavigationMenuItem key={l.to}>
                      <NavigationMenuLink to={l.to}>{l.label}</NavigationMenuLink>
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>

              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => { toggleTheme(); }} aria-label="Toggle theme">🌙</Button>
                {!isAuthenticated ? (
                  <Button variant="outline" onClick={() => setAuthOpen(true)}>Login</Button>
                ) : (
                  <Button variant="outline" onClick={handleLogout}>Logout</Button>
                )}
              </div>
            </div>
          </div>
        </nav>
      </header>

      <Dialog isOpen={authOpen} onClose={() => setAuthOpen(false)} title="Login">
        <LoginForm onSuccess={() => setAuthOpen(false)} onCancel={() => setAuthOpen(false)} />
      </Dialog>

      <AppToaster />
    </>
  );
};

export default Header;
