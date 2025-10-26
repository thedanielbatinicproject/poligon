// Simple cookie helpers for role management
// Stores a JSON object in cookie `poligon_info` like: { "role": "user" }
export const POLIGON_COOKIE = 'poligon_info';

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function parsePoligonCookie(): { role?: string } | null {
  const raw = readCookie(POLIGON_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) return parsed as { role?: string };
  } catch (e) {
    // if cookie is not JSON, ignore
  }
  return null;
}

export function getRoleFromCookie(): string | null {
  const parsed = parsePoligonCookie();
  if (!parsed) return null;
  return parsed.role ?? null;
}

export function setRoleCookie(role: string, days = 7) {
  const payload = JSON.stringify({ role });
  writeCookie(POLIGON_COOKIE, payload, days);
}

export function refreshRoleCookie(days = 7) {
  const parsed = parsePoligonCookie();
  if (!parsed || !parsed.role) return;
  // rewrite cookie to extend expiry
  setRoleCookie(parsed.role, days);
}
