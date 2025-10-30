import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound(): JSX.Element {
  return (
    <div className="not-found-page">
      <div className="not-found-content glass-panel">
        <div className="not-found-code">404</div>
        <h1 className="not-found-title">Page not found</h1>
        <p className="not-found-desc">We couldn't find the page you were looking for.</p>
        <div style={{ marginTop: 18 }}>
          <Link to="/" className="btn btn-primary">
            BACK TO HOME
          </Link>
        </div>
      </div>
    </div>
  )
}