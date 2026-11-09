import type { ParseKeys } from 'i18next'
import { matchPath } from 'react-router'

export type HeaderKind = 'home' | 'large' | 'inner' | 'overlay' | 'none'
export type ScreenRoute = { kind: 'main' | 'inner'; header: HeaderKind; titleKey?: ParseKeys }
export const screenRoutes: Record<string, ScreenRoute> = {
  '/': { kind: 'main', header: 'home' },
  '/search': { kind: 'main', header: 'large', titleKey: 'nav.search' },
  '/c/:slug': { kind: 'main', header: 'large', titleKey: 'nav.search' },
  '/messages': { kind: 'main', header: 'large', titleKey: 'nav.messages' },
  '/account': { kind: 'main', header: 'large', titleKey: 'nav.account' },
  '/a/:id': { kind: 'inner', header: 'overlay' },
  '/messages/:id': { kind: 'inner', header: 'inner', titleKey: 'nav.messages' },
}
export function resolveScreenRoute(pathname: string): ScreenRoute {
  return (
    Object.entries(screenRoutes).find(([path]) => matchPath({ path, end: true }, pathname))?.[1] ?? {
      kind: 'inner',
      header: 'inner',
    }
  )
}
export function parentRoute(pathname: string): string {
  if (/^\/a\/[^/]+\/edit\/?$/.test(pathname)) return pathname.replace(/\/edit\/?$/, '')
  if (pathname.startsWith('/account/')) return pathname.slice(0, pathname.lastIndexOf('/'))
  if (pathname.startsWith('/messages/')) return '/messages'
  return '/'
}
