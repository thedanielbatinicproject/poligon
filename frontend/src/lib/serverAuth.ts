import { api } from './api';

export const POLIGON_COOKIE = 'poligon_info';

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function removePoligonCookie() {
  writeCookie(POLIGON_COOKIE, '', -1);
}

export function parsePoligonCookie(): any | null {
  const raw = readCookie(POLIGON_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
  } catch (e) {
    // ignore
  }
  return null;
}

export function getRoleFromCookie(): string | null {
  const parsed = parsePoligonCookie();
  if (!parsed) return null;
  const role = parsed?.user?.role ?? parsed?.role ?? null;
  return typeof role === 'string' ? role : null;
}

export function setPoligonInfoCookie(statusResponse: any) {
  const payload: any = {
    status: statusResponse?.status ?? 'ok',
    time: statusResponse?.time ?? new Date().toISOString(),
    session: statusResponse?.session ?? null,
    user: statusResponse?.user ?? null,
  };

  let days = 7;
  const expiresAt = payload?.session?.expires_at;
  if (typeof expiresAt === 'string') {
    const d = new Date(expiresAt);
    if (!isNaN(d.getTime())) {
      const ms = d.getTime() - Date.now();
      days = Math.max(1, Math.ceil(ms / 864e5));
    }
  }

  writeCookie(POLIGON_COOKIE, JSON.stringify(payload), days);
}

export function refreshPoligonCookie() {
  const parsed = parsePoligonCookie();
  if (!parsed) return;
  setPoligonInfoCookie(parsed);
}

export async function syncStatusFromServer() {
  const resp = await api.status();
  setPoligonInfoCookie(resp);
  const role = resp?.user?.role ?? null;
  window.dispatchEvent(new CustomEvent('poligon:roleChanged', { detail: { role, user: resp?.user ?? null } }));
  return resp;
}

export async function loginLocal(email: string, password: string) {
  await api.loginLocal({ email, password });
  const statusResp = await api.status();
  setPoligonInfoCookie(statusResp);
  const role = statusResp?.user?.role ?? null;
  window.dispatchEvent(new CustomEvent('poligon:roleChanged', { detail: { role, user: statusResp?.user ?? null } }));
  return statusResp;
}

export async function logoutFromServer() {
  try {
    await api.logout();
  } catch (e) {
    // ignore
  }
  removePoligonCookie();
  window.dispatchEvent(new CustomEvent('poligon:roleChanged', { detail: { role: 'visitor' } }));
}

export default {
  loginLocal,
  logoutFromServer,
  syncStatusFromServer,
  parsePoligonCookie,
  getRoleFromCookie,
  setPoligonInfoCookie,
  removePoligonCookie,
};
