import React from 'react';
import { Navigate } from 'react-router-dom';
import { getRoleFromCookie } from '../lib/serverAuth';

type Props = {
  allowedRoles?: string[];
  children: React.ReactElement;
};

const ProtectedRoute: React.FC<Props> = ({ allowedRoles, children }) => {
  if (!allowedRoles || allowedRoles.length === 0) return children;
  const role = getRoleFromCookie() ?? 'visitor';
  if (allowedRoles.includes(role)) return children;
  return <Navigate to="/forbidden" replace />;
};

export default ProtectedRoute;
