import { IS_APP, PUBLIC_SITE_URL } from '../native/platform'

/**
 * Absolute address of the site root, e.g. "https://lupudan.github.io/telauto/" or "http://localhost:5173/".
 * Used for links in emails and for shared links (must be listed in Supabase "Redirect URLs", see supabase/config.toml).
 * In the app the WebView address is https://localhost, so the public website address is used instead.
 */
export function getSiteBaseUrl(): string {
  if (IS_APP) return PUBLIC_SITE_URL
  return new URL(import.meta.env.BASE_URL, window.location.origin).href
}

/** Only allow internal paths like "/account" as redirect targets (never "//evil.com" or full URLs). */
export function safeInternalPath(path: string | null | undefined, fallback = '/'): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    return fallback
  }
  return path
}
