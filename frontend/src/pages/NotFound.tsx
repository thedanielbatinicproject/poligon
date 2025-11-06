import React from 'react'
import { Link } from 'react-router-dom'

interface NotFoundProps {
  code?: string | number;
  title?: string;
  description?: string;
}

export default function NotFound({ 
  code = '404', 
  title = 'Page not found', 
  description = "We couldn't find the page you were looking for." 
}: NotFoundProps): JSX.Element {
  return (
    <div className="not-found-page">
      <div className="not-found-content glass-panel">
        <div className="not-found-code">{code}</div>
        <h1 className="not-found-title">{title}</h1>
        <p className="not-found-desc">{description}</p>
        <div style={{ marginTop: 18 }}>
          <Link to="/" className="btn btn-primary">
            BACK TO HOME
          </Link>
        </div>
      </div>
    </div>
  )
}