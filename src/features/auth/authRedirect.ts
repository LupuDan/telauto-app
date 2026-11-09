/**
 * Email links (confirm account, reset password) come back to the site root as
 *   https://.../telauto/?flow=signup&code=XYZ           (success, PKCE flow)
 *   https://.../telauto/?flow=signup#error=...&error_code=otp_expired   (failure)
 * In the Android app they come back as md.telauto.app://auth/?flow=signup&code=XYZ (see src/native/deepLinks.ts).
 * HashRouter only looks at the part after "#", so we turn these values into the route "#/auth/confirm?...".
 */
export function authConfirmRoute(href: string): string | null {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  const query = url.searchParams
  const hashParams = /^#(error|error_code|access_token)=/.test(url.hash)
    ? new URLSearchParams(url.hash.slice(1))
    : null

  const code = query.get('code')
  const errorCode =
    query.get('error_code') ?? hashParams?.get('error_code') ?? query.get('error') ?? hashParams?.get('error')

  if (!code && !errorCode) {
    return null
  }

  const route = new URLSearchParams()
  if (code) route.set('code', code)
  if (errorCode) route.set('error_code', errorCode)
  const flow = query.get('flow')
  if (flow === 'signup' || flow === 'recovery') route.set('flow', flow)
  return `#/auth/confirm?${route.toString()}`
}

/** Before the app starts: move the email link values into the hash route and remove them from the address bar. */
export function captureAuthRedirect(): void {
  const route = authConfirmRoute(window.location.href)
  if (!route) return
  const url = new URL(window.location.href)
  window.history.replaceState(null, '', `${url.origin}${url.pathname}${route}`)
}
