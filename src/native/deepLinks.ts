import { App } from '@capacitor/app'
import { authConfirmRoute } from '../features/auth/authRedirect'
import { APP_AUTH_URL, IS_APP } from './platform'

function openAuthLink(url: string | undefined) {
  if (!url || !url.startsWith(APP_AUTH_URL)) return
  const route = authConfirmRoute(url)
  if (route) window.location.hash = route
}

/**
 * App only: email links md.telauto.app://auth/?code=... open the app (AndroidManifest intent-filter).
 * Handles both a closed app (launch URL) and an app already running (appUrlOpen event).
 */
export function listenForDeepLinks(): void {
  if (!IS_APP) return
  void App.getLaunchUrl().then((launch) => openAuthLink(launch?.url))
  void App.addListener('appUrlOpen', (event) => openAuthLink(event.url))
}
