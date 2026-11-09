export function createBackStack() {
  const handlers: Array<() => boolean> = []
  return {
    add(handler: () => boolean) {
      handlers.push(handler)
      return () => {
        const i = handlers.indexOf(handler)
        if (i >= 0) handlers.splice(i, 1)
      }
    },
    run() {
      return [...handlers].reverse().some((handler) => handler())
    },
  }
}

export function classifyLink(href: string, base: string, target = ''): 'internal' | 'external' | 'blocked' {
  try {
    const url = new URL(href, base)
    if (/^(tel|mailto|sms|viber|whatsapp|tg|geo):$/.test(url.protocol)) return 'external'
    if (!/^https?:$/.test(url.protocol)) return 'blocked'
    const own = new URL(base)
    if (
      url.origin === own.origin &&
      url.pathname === own.pathname &&
      url.search === own.search &&
      url.hash.startsWith('#/')
    )
      return 'internal'
    return url.origin !== own.origin || target.toLowerCase() === '_blank' ? 'external' : 'internal'
  } catch {
    return 'blocked'
  }
}

/** Only entries created since startup are eligible; never leave the app's initial entry. */
export function trackHistory(win: Window): () => boolean {
  const key = '__telautoNativeDepth'
  let depth = 0
  let lastUrl = win.location.href
  const mark = () => win.history.replaceState({ ...win.history.state, [key]: depth }, '')
  mark()
  const push = win.history.pushState.bind(win.history)
  const replace = win.history.replaceState.bind(win.history)
  win.history.pushState = (state, unused, url) => {
    push({ ...state, [key]: ++depth }, unused, url)
    lastUrl = win.location.href
  }
  win.history.replaceState = (state, unused, url) => {
    replace({ ...state, [key]: depth }, unused, url)
    lastUrl = win.location.href
  }
  const changed = () => {
    const saved: unknown = win.history.state?.[key]
    if (typeof saved === 'number') depth = saved
    else if (win.location.href !== lastUrl) {
      depth++
      mark()
    }
    lastUrl = win.location.href
  }
  win.addEventListener('popstate', changed)
  win.addEventListener('hashchange', changed)
  return () => depth > 0
}
