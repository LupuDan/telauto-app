/**
 * True in the Android app build (`npm run build:app`, Vite mode "app"), false on the website.
 * Decided at build time, so app-only code is removed from the website bundle.
 */
export const IS_APP = import.meta.env.MODE === 'app'

/** Public address of the website. In the app, links people share or open must point here, not to the WebView. */
export const PUBLIC_SITE_URL: string = import.meta.env.VITE_SITE_URL ?? 'https://lupudan.github.io/telauto/'

/** Own address of the app: email links (confirm account, reset password) open the app directly. */
export const APP_AUTH_URL = 'md.telauto.app://auth/'
