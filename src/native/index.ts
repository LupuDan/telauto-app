/**
 * Everything the app pages need from Android, in one place (PLAN_DESIGN_APP.md).
 * On the website (IS_APP false) every function falls back to normal browser behaviour or does nothing.
 *
 * CONTRACT for the screens (do not change the signatures without updating the callers):
 * the bodies below are placeholders; the real implementation comes in stage 3 (Codex C2).
 */
export { APP_AUTH_URL, IS_APP, PUBLIC_SITE_URL } from './platform'
export { listenForDeepLinks } from './deepLinks'

/**
 * Starts the Android integration once (call from main.tsx): hardware/gesture Back, status bar colours that follow
 * the theme, keyboard behaviour, portrait orientation. Back order: registered handlers (newest first) →
 * history back → on a main tab go to Acasă → on Acasă "press again to exit" (appShell.pressAgainToExit), then exit.
 */
export function initNative(): void {}

/**
 * Registers a handler for Android Back while `enabled` (e.g. an open sheet, the full-screen gallery, a form step).
 * Return true when the handler did something (Back stops there), false to let the next handler / default run.
 */
export function useBackHandler(handler: () => boolean, enabled = true): void {
  void handler
  void enabled
}

/** Opens tel:, mailto:, WhatsApp/Viber/Telegram/maps or any outside website in the right app, not inside Telauto. */
export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener')
}

/** Share menu with the public website link. Website: navigator.share, otherwise copies the link. */
export async function shareLink(options: { title: string; url: string }): Promise<'shared' | 'copied' | 'cancelled'> {
  void options
  return 'cancelled'
}

/** Short vibration: 'light' for favourite / tab tap, 'success' for published / message sent. */
export function haptic(kind: 'light' | 'success'): void {
  void kind
}

/** True while the phone has internet (Network plugin in the app, navigator.onLine on the website). */
export function useOnline(): boolean {
  return true
}

/** Height in px of the open on-screen keyboard (0 when closed); the chat input stays above it. */
export function useKeyboardHeight(): number {
  return 0
}

/** Allows turning the screen while true (full-screen gallery); otherwise the app stays portrait. */
export function useAllowRotation(enabled: boolean): void {
  void enabled
}

/** App version shown in Cont → Despre aplicație (e.g. "1.0.0"); null on the website. */
export function useAppVersion(): string | null {
  return null
}
