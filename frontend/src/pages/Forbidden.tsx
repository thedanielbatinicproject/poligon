import React from 'react';
import { Link } from 'react-router-dom';

const Forbidden: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Access denied</h1>
      <p className="mb-4">You do not have permission to view this page.</p>
      <Link to="/" className="text-primary underline">Go back home</Link>
    </div>
  );
};

export default Forbidden;
