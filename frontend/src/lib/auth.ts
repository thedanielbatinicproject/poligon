// Compatibility/auth shim for the frontend.
// Exposes the legacy-named helpers (used across the app) while delegating
// real server-backed behavior to `src/lib/serverAuth`.
import * as serverAuth from './serverAuth';

export const POLIGON_COOKIE = 'poligon_info';

// Primary aliases (server-backed implementations)
export const parsePoligonCookie = serverAuth.parsePoligonCookie;
export const getRoleFromCookie = serverAuth.getRoleFromCookie;
export const setPoligonInfoCookie = serverAuth.setPoligonInfoCookie;
export const refreshPoligonCookie = serverAuth.refreshPoligonCookie;
export const removePoligonCookie = serverAuth.removePoligonCookie;
export const syncStatusFromServer = serverAuth.syncStatusFromServer;
export const loginLocal = serverAuth.loginLocal;
export const logoutFromServer = serverAuth.logoutFromServer;

// Legacy / convenience aliases kept for compatibility with existing imports:
export const removeRoleCookie = removePoligonCookie;
export const refreshRoleCookie = refreshPoligonCookie;

// Backfill a simple setRoleCookie helper that other parts of the app may call.
// This writes a minimal JSON payload { role } into `poligon_info` and sets an expiry.
export function setRoleCookie(role: string, days = 7) {
  const payload = { role };
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${POLIGON_COOKIE}=${encodeURIComponent(JSON.stringify(payload))}; expires=${expires}; path=/; SameSite=Lax`;
}

// Re-export default for convenience if some modules import default
export default {
  parsePoligonCookie,
  getRoleFromCookie,
  setPoligonInfoCookie,
  setRoleCookie,
  refreshPoligonCookie,
  refreshRoleCookie,
  removePoligonCookie,
  removeRoleCookie,
  syncStatusFromServer,
  loginLocal,
  logoutFromServer,
};