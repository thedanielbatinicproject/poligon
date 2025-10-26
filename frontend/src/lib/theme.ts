// Simple theme helper: persist 'light'|'dark' in localStorage and apply
// the `dark` class to document.documentElement when appropriate.

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'poligon:theme';

export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'dark' || v === 'light' ? (v as Theme) : null;
  } catch {
    return null;
  }
}

export function storeTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

export function prefersDark(): boolean {
  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (!root) return;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function getInitialTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  return prefersDark() ? 'dark' : 'light';
}

export function toggleTheme() {
  const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  storeTheme(next);
  return next;
}
