import React from 'react';
import { NavLink } from 'react-router-dom';

const linkBase: React.CSSProperties = {
  textDecoration: 'none',
  color: 'inherit',
  padding: '6px 10px',
  borderRadius: 6,
  display: 'inline-block',
};

const linkActive: React.CSSProperties = {
  backgroundColor: '#e6f0ff',
  color: '#03396c',
  fontWeight: 600,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 20px',
  borderBottom: '1px solid #eee',
  background: '#ffffff',
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
};

export default function Header(): JSX.Element {
  return (
    <header style={headerStyle}>
      <div style={{ fontWeight: 700, fontSize: 18 }}>Poligon</div>

      <nav style={navStyle} aria-label="Main navigation">
        <NavLink to="/" end style={({ isActive }) => (isActive ? { ...linkBase, ...linkActive } : linkBase)}>
          Home
        </NavLink>

        <NavLink to="/profile" style={({ isActive }) => (isActive ? { ...linkBase, ...linkActive } : linkBase)}>
          Profile
        </NavLink>

        <NavLink to="/documents" style={({ isActive }) => (isActive ? { ...linkBase, ...linkActive } : linkBase)}>
          Documents
        </NavLink>

        <NavLink to="/tasks" style={({ isActive }) => (isActive ? { ...linkBase, ...linkActive } : linkBase)}>
          Tasks
        </NavLink>

        <NavLink to="/mentor" style={({ isActive }) => (isActive ? { ...linkBase, ...linkActive } : linkBase)}>
          Mentor
        </NavLink>

        <NavLink to="/admin" style={({ isActive }) => (isActive ? { ...linkBase, ...linkActive } : linkBase)}>
          Admin
        </NavLink>
      </nav>
    </header>
  );
}