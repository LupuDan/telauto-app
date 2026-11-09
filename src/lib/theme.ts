import { IS_APP } from '../native/platform'
// Light / dark mode. The first choice follows the phone or computer setting; the ☀/🌙 button
// overrides it and the choice is remembered in this browser. index.html applies the saved
// choice before the page is drawn, so there is no white flash when opening the site in dark mode.

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'telauto.theme'
// same as the header background (--color-surface in src/styles/tokens.css)
const THEME_COLORS: Record<Theme, string> = { light: '#ffffff', dark: '#162032' }

export function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function setTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  // colour of the browser bar on phones
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // private mode: the choice lasts until the tab is closed
  }
  window.dispatchEvent(new Event('telauto:theme'))
}

/** For components: re-render when the theme changes (useSyncExternalStore). */
export function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener('telauto:theme', onChange)
  return () => window.removeEventListener('telauto:theme', onChange)
}

export type ThemePreference = Theme | 'system'
export function themePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  } catch {
    return 'system'
  }
}
const systemTheme = () => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
export function setThemePreference(value: ThemePreference): void {
  if (value !== 'system') {
    setTheme(value)
    return
  }
  setTheme(systemTheme())
  try {
    localStorage.removeItem(THEME_STORAGE_KEY)
  } catch {
    /* Storage unavailable. */
  }
  window.dispatchEvent(new Event('telauto:theme'))
}
if (IS_APP) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', () => {
    if (themePreference() === 'system') setThemePreference('system')
  })
  if (themePreference() === 'system') setThemePreference('system')
}
