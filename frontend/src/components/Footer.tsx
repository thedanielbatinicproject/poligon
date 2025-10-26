import React from 'react';

const Footer: React.FC = () => (
  <footer className="border-t mt-8 py-6 text-center text-sm text-gray-600">
    © {new Date().getFullYear()} Poligon
  </footer>
);

export default Footer;
