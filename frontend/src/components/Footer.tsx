import React from 'react'

export default function Footer(): JSX.Element {
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span>© {year} Poligon</span>
        <nav className="site-footer-nav" aria-label="Footer">
          <a href="/privacy" className="footer-link">Privacy</a>
          <a href="/terms" className="footer-link">Terms</a>
        </nav>
      </div>
    </footer>
  )
}
