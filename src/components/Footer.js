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
            style={{ 
              color: '#3498db', 
              textDecoration: 'none',
              fontWeight: 'bold',
              transition: 'color 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#2980b9'}
            onMouseLeave={(e) => e.target.style.color = '#3498db'}
          >
            GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}

export default Footer;