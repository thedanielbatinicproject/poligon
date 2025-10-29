import React from 'react'
import { useTheme } from '../lib/theme'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      style={{
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: 6,
        borderRadius: 8,
      }}
    >
      {theme === 'light' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3v2" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 19v2" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4.2 4.2l1.4 1.4" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18.4 18.4l1.4 1.4" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="4" stroke="#111" strokeWidth="2" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}
