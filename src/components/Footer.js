import React from 'react';

function Footer() {
  const currentYear = new Date().getFullYear();
  const yearRange = currentYear > 2025 ? `2025-${currentYear}` : '2025';

  return (
    <footer>
      <div className="container">
        <p>
          &copy; {yearRange} Poligon. Sva prava pridržana. {' '}
          <a 
            href="https://github.com/thedanielbatinicproject/poligon" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'underline' }}
          >
            GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}

export default Footer;