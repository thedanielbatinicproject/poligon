import React from 'react';
import { Link } from 'react-router-dom';

type PropsWithChildren = {
  children?: React.ReactNode;
  className?: string;
};

export const NavigationMenu: React.FC<PropsWithChildren> = ({ children, className = '' }) => {
  return (
    <div className={`navigation-menu ${className}`}>
      {children}
    </div>
  );
};

export const NavigationMenuList: React.FC<PropsWithChildren> = ({ children, className = '' }) => {
  return (
    <ul className={`navigation-menu-list flex items-center gap-4 ${className}`}>
      {children}
    </ul>
  );
};

export const NavigationMenuItem: React.FC<PropsWithChildren & { key?: string | number }> = ({ children, className = '' }) => {
  return (
    <li className={`navigation-menu-item ${className}`}>
      {children}
    </li>
  );
};

export const NavigationMenuLink: React.FC<{
  to: string;
  children?: React.ReactNode;
  className?: string;
}> = ({ to, children, className = '' }) => {
  return (
    <Link to={to} className={`text-gray-700 hover:text-gray-900 transition-colors ${className}`}>
      {children}
    </Link>
  );
};

export default NavigationMenu;
