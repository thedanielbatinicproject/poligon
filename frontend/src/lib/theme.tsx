import React, { createContext, useContext, useEffect, useState } from 'react'

/**
 * ThemeProvider (single implementation)
 * - Persists choice in cookie `poligon_theme`
 * - Default: 'light'
 */

const THEME_COOKIE = 'poligon_theme'
export type Theme = 'light' | 'dark'

function readThemeCookie(): Theme | null {
  const m = document.cookie.match(new RegExp('(^| )' + THEME_COOKIE + '=([^;]+)'))
  if (!m) return null
  try {
    const v = decodeURIComponent(m[2])
    if (v === 'dark' || v === 'light') return v as Theme
    return null
  } catch (e) {
    return null
  }
}

function writeThemeCookie(theme: Theme) {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${THEME_COOKIE}=${encodeURIComponent(theme)}; path=/; expires=${expires}`
}

type ThemeContextShape = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextShape | undefined>(undefined)

export function useTheme(): ThemeContextShape {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    const cookie = readThemeCookie()
    const initial = cookie || 'light'
    setThemeState(initial)
    try {
      document.documentElement.setAttribute('data-theme', initial)
    } catch (e) {
      /* ignore */
    }
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    try {
      document.documentElement.setAttribute('data-theme', t)
      writeThemeCookie(t)
    } catch (e) {
      /* ignore */
    }
  }

  function toggle() {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
}
