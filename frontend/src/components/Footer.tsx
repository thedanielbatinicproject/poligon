import React, { useState } from 'react'
import PrivacyPolicyModal from './PrivacyPolicyModal'

export default function Footer(): JSX.Element {
  const year = new Date().getFullYear()
  const [privacyOpen, setPrivacyOpen] = useState(false)

  return (
    <>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <span>© {year} Poligon</span>
          <nav className="site-footer-nav" aria-label="Footer">
            <button 
              onClick={() => setPrivacyOpen(true)} 
              className="footer-link footer-link-btn"
              type="button"
            >
              Privacy
            </button>
            <a href="https://github.com/thedanielbatinicproject/poligon" className="footer-link" target="_blank" rel="noopener noreferrer">GitHub Repo</a>
          </nav>
        </div>
      </footer>
      <PrivacyPolicyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </>
  )
}
