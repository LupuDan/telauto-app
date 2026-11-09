import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import i18next from 'i18next'
import { App } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { Share } from '@capacitor/share'
import { Clipboard } from '@capacitor/clipboard'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Network } from '@capacitor/network'
import { Keyboard } from '@capacitor/keyboard'
import { currentTheme, subscribeTheme } from '../lib/theme'
import { toast } from '../lib/toast'
import { IS_APP, PUBLIC_SITE_URL } from './platform'
import { classifyLink, createBackStack, trackHistory } from './logic'

export { APP_AUTH_URL, IS_APP, PUBLIC_SITE_URL } from './platform'
export { listenForDeepLinks } from './deepLinks'

const backStack = createBackStack()
let initialized = false
let rotationUsers = 0
let orientationQueue = Promise.resolve()
function updateOrientation() {
  orientationQueue = orientationQueue
    .catch(() => {})
    .then(async () => {
      if (rotationUsers > 0) await ScreenOrientation.unlock()
      else await ScreenOrientation.lock({ orientation: 'portrait' })
    })
    .catch(() => {})
}

export function initNative(): void {
  if (!IS_APP || initialized) return
  initialized = true
  const canGoBack = trackHistory(window)
  let lastExit: number | null = null
  let navigating = false
  const reset = () => {
    navigating = false
    lastExit = null
  }
  window.addEventListener('popstate', reset)
  window.addEventListener('hashchange', reset)
  void App.addListener('backButton', () => {
    if (backStack.run()) {
      lastExit = null
      return
    }
    if (navigating) return
    if (canGoBack()) {
      navigating = true
      window.history.back()
      return
    }
    if (window.location.hash !== '#/' && window.location.hash !== '') {
      window.location.replace('#/')
      return
    }
    const now = Date.now()
    if (lastExit !== null && now - lastExit < 2000) {
      lastExit = null
      void App.exitApp().catch(() => {})
    } else {
      lastExit = now
      toast(i18next.t('appShell.pressAgainToExit'), { duration: 2000 })
    }
  }).catch(() => {})
  const applyTheme = () => {
    const dark = currentTheme() === 'dark'
    const color = dark ? '#162032' : '#ffffff'
    document.documentElement.style.backgroundColor = color
    void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {})
    // Android 16 enforces a transparent status bar: the WebView paints its background.
    void StatusBar.setBackgroundColor({ color }).catch(() => {})
  }
  applyTheme()
  subscribeTheme(applyTheme)
  // SystemBars injects CSS px, including 0px when native padding already protects the WebView.
  const syncInsets = () => {
    const root = document.documentElement
    for (const edge of ['top', 'bottom']) {
      const value = root.style.getPropertyValue(`--safe-area-inset-${edge}`).trim()
      if (/^\d+(\.\d+)?px$/.test(value) && root.style.getPropertyValue(`--app-inset-${edge}`) !== value) {
        root.style.setProperty(`--app-inset-${edge}`, value)
      }
    }
  }
  new MutationObserver(syncInsets).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
  syncInsets()
  updateOrientation()
  document.addEventListener(
    'click',
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      const anchor = event.composedPath().find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement)
      if (!anchor || anchor.hasAttribute('download')) return
      const kind = classifyLink(anchor.href, window.location.href, anchor.target)
      if (kind === 'internal' && anchor.target.toLowerCase() === '_blank') {
        // the WebView cannot open new windows: open our own pages (terms, privacy) in the app itself
        event.preventDefault()
        window.location.assign(anchor.href)
        return
      }
      if (kind !== 'external') return
      event.preventDefault()
      openExternal(anchor.href)
    },
    true,
  )
}

export function useBackHandler(handler: () => boolean, enabled = true): void {
  const latest = useRef(handler)
  useLayoutEffect(() => {
    latest.current = handler
  }, [handler])
  useEffect(() => {
    if (IS_APP && enabled) return backStack.add(() => latest.current())
  }, [enabled])
}

export function openExternal(url: string): void {
  const kind = classifyLink(url, window.location.href, '_blank')
  if (kind === 'blocked') return
  // BridgeWebViewClient.shouldOverrideUrlLoading -> Bridge.launchIntent -> ACTION_VIEW.
  // _blank depends on WebChromeClient popup support; navigating _self reliably reaches Bridge.
  if (IS_APP) {
    if (kind === 'internal') return
    let destination = new URL(url, window.location.href)
    // Bridge keeps its own origin inside WebView, even with target=_blank.
    // Open the corresponding public page instead of navigating away from the app.
    if (destination.origin === window.location.origin) {
      destination = new URL(
        destination.pathname.replace(/^\//, '') + destination.search + destination.hash,
        PUBLIC_SITE_URL,
      )
    }
    window.location.assign(destination.href)
  } else window.open(url, '_blank', 'noopener,noreferrer')
}

export async function shareLink(options: { title: string; url: string }): Promise<'shared' | 'copied' | 'cancelled'> {
  try {
    if (IS_APP) {
      await Share.share(options)
      return 'shared'
    }
    if (navigator.share) {
      await navigator.share(options)
      return 'shared'
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if ((error as { name?: string })?.name === 'AbortError' || /cancel(?:led|ed)?/i.test(message)) return 'cancelled'
    // Unsupported share targets fall back to copying. Clipboard failures remain visible to callers.
  }
  if (IS_APP) await Clipboard.write({ string: options.url })
  else await navigator.clipboard.writeText(options.url)
  return 'copied'
}

export function haptic(kind: 'light' | 'success'): void {
  if (!IS_APP) return
  void (
    kind === 'light'
      ? Haptics.impact({ style: ImpactStyle.Light })
      : Haptics.notification({ type: NotificationType.Success })
  ).catch(() => {})
}

/** Handles unmount even when native listener registration is still pending (React StrictMode). */
function listenerLifetime() {
  let disposed = false
  const handles: PluginListenerHandle[] = []
  return {
    add(promise: Promise<PluginListenerHandle>) {
      void promise
        .then((handle) => {
          if (disposed) void handle.remove().catch(() => {})
          else handles.push(handle)
        })
        .catch(() => {})
    },
    dispose() {
      disposed = true
      for (const handle of handles) void handle.remove().catch(() => {})
    },
  }
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    let active = true
    let revision = 0
    const update = (value: boolean) => {
      revision++
      if (active) setOnline(value)
    }
    const browserUpdate = () => update(navigator.onLine)
    window.addEventListener('online', browserUpdate)
    window.addEventListener('offline', browserUpdate)
    const listeners = listenerLifetime()
    if (IS_APP) {
      listeners.add(Network.addListener('networkStatusChange', (status) => update(status.connected)))
      const requestedAt = revision
      void Network.getStatus()
        .then((status) => {
          if (active && revision === requestedAt) setOnline(status.connected)
        })
        .catch(() => {})
    }
    return () => {
      active = false
      listeners.dispose()
      window.removeEventListener('online', browserUpdate)
      window.removeEventListener('offline', browserUpdate)
    }
  }, [])
  return online
}

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0)
  useEffect(() => {
    if (!IS_APP) return
    let active = true
    const listeners = listenerLifetime()
    listeners.add(
      Keyboard.addListener('keyboardWillShow', ({ keyboardHeight }) => {
        if (active) setHeight(Math.max(0, keyboardHeight))
      }),
    )
    listeners.add(
      Keyboard.addListener('keyboardWillHide', () => {
        if (active) setHeight(0)
      }),
    )
    return () => {
      active = false
      listeners.dispose()
    }
  }, [])
  return height
}

export function useAllowRotation(enabled: boolean): void {
  useEffect(() => {
    if (!IS_APP) return
    if (enabled) rotationUsers++
    updateOrientation()
    return () => {
      if (enabled) rotationUsers--
      updateOrientation()
    }
  }, [enabled])
}

export function useAppVersion(): string | null {
  const [version, setVersion] = useState<string | null>(null)
  useEffect(() => {
    if (!IS_APP) return
    let active = true
    void App.getInfo()
      .then((info) => {
        if (active) setVersion(info.version)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  return version
}
