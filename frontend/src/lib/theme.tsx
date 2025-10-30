import React, { createContext, useContext, useEffect, useState } from 'react'

/**
 * ThemeProvider
 * - Persists choice in cookie `poligon_theme`
 * - Supports: 'light' | 'dark' | 'auto'
 * - Listens for a server-provided theme via a `server-theme` CustomEvent
 * - Emits local theme changes via a `local-theme-changed` CustomEvent
 */

const THEME_COOKIE = 'poligon_theme'
export type Theme = 'light' | 'dark' | 'auto'

function readThemeCookie(): Theme | null {
  const m = document.cookie.match(new RegExp('(^| )' + THEME_COOKIE + '=([^;]+)'))
  if (!m) return null
  try {
    const v = decodeURIComponent(m[2])
    if (v === 'dark' || v === 'light' || v === 'auto') return v as Theme
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

function resolveEffective(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto') {
    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } catch (e) {
      return 'light'
    }
  }
  return theme === 'dark' ? 'dark' : 'light'
}

export const ThemeProvider: React.FC<{ children: React.ReactNode; initialTheme?: Theme }> = ({ children, initialTheme }) => {
  const [theme, setThemeState] = React.useState<Theme>('light')

  useEffect(() => {
    // priority: explicit initialTheme prop -> server provided -> cookie -> default 'light'
    const server = (window as any).__SERVER_THEME__
    const cookie = readThemeCookie()
    const initial = (initialTheme as Theme) || (server as Theme) || cookie || 'light'
    setThemeState(initial as Theme)
    try {
      document.documentElement.setAttribute('data-theme', resolveEffective(initial as Theme))
    } catch (e) {
      /* ignore */
    }

    function onServer(e: any) {
      const t = e && e.detail ? (e.detail as Theme) : (window as any).__SERVER_THEME__
      if (t) {
        setThemeState(t)
        try {
          document.documentElement.setAttribute('data-theme', resolveEffective(t))
        } catch (e) {}
      }
    }

    window.addEventListener('server-theme', onServer as EventListener)
    return () => {
      window.removeEventListener('server-theme', onServer as EventListener)
    }
  }, [initialTheme])

  function setTheme(t: Theme) {
    setThemeState(t)
    try {
      document.documentElement.setAttribute('data-theme', resolveEffective(t))
      writeThemeCookie(t)
      // notify other parts (SessionProvider listens for this and will persist to server)
      window.dispatchEvent(new CustomEvent('local-theme-changed', { detail: t }))
    } catch (e) {
      /* ignore */
    }
  }

  function toggle() {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
}
