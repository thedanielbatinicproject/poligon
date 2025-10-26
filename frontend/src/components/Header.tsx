import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg">Poligon</Link>
        <div className="flex items-center gap-4">
          <Link to="/">Home</Link>
          <Link to="/profile">Profile</Link>
          <Link to="/documents">Documents</Link>
          <Link to="/files">Files</Link>
          <Link to="/tasks">Tasks</Link>
          <button className="text-blue-600" onClick={() => setAuthOpen(true)}>Login</button>
        </div>
      </nav>
    </header>
  );
};

export default Header;
