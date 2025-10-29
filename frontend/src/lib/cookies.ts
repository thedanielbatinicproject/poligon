const COOKIE_NAME = 'poligon_local_info'

export function setPoligonCookie(obj: any) {
  try {
    const v = encodeURIComponent(JSON.stringify(obj))
    // safe readable cookie, 7 days
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString()
    document.cookie = `${COOKIE_NAME}=${v}; path=/; expires=${expires}`
  } catch (e) {
    // ignore
  }
}

export function getPoligonCookie(): any | null {
  const m = document.cookie.match(new RegExp('(^| )' + COOKIE_NAME + '=([^;]+)'))
  if (!m) return null
  try {
    return JSON.parse(decodeURIComponent(m[2]))
  } catch (e) {
    return null
  }
}

export function removePoligonCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export { COOKIE_NAME }
