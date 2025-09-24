import React from 'react';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer>
      <div className="container">
        <p>&copy; {currentYear} Poligon. Sva prava pridržana.</p>
      </div>
    </footer>
  );
}

export default Footer;