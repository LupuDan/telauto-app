import {
  Suspense,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
} from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { UNSAFE_LocationContext, useLocation, useNavigationType, useOutlet } from 'react-router'
import { BottomNav } from '../components/BottomNav'
import { Toaster } from '../components/ui/Toaster'
import { useLiveUnreadCounter } from '../features/messages/api'
import { AppHeader } from './AppHeader'
import { OfflineBanner } from './Offline'
import { ScreenHeaderContext, type ScreenHeaderOptions } from './ScreenHeader'
import { SkeletonRows } from './Skeleton'
import { resolveScreenRoute } from './routes'
import { useScrollRestoration } from './scroll'
import './appshell.css'

/** Public class for a page's fixed bottom action panel. */
export const appBottomPanelClass = 'app-shell-bottom-panel'

function ScreenFrame({ outlet }: { outlet: ReactNode }) {
  const location = useLocation()
  const route = resolveScreenRoute(location.pathname)
  const { t } = useTranslation()
  const [override, setOverride] = useState<{ owner: symbol; options: ScreenHeaderOptions } | null>(null)
  const context = useMemo(
    () => ({
      set: (owner: symbol, options: ScreenHeaderOptions) =>
        setOverride((previous) => {
          if (
            previous?.owner === owner &&
            Object.keys(options).every(
              (key) => options[key as keyof ScreenHeaderOptions] === previous.options[key as keyof ScreenHeaderOptions],
            ) &&
            Object.keys(options).length === Object.keys(previous.options).length
          )
            return previous
          return { owner, options }
        }),
      clear: (owner: symbol) => setOverride((previous) => (previous?.owner === owner ? null : previous)),
    }),
    [],
  )
  useScrollRestoration()
  const ownBar = /^\/a\/[^/]+(?:\/edit)?\/?$/.test(location.pathname) || location.pathname === '/new'
  function repeatTab(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as Element).closest('a[aria-current="page"]')
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  return (
    <ScreenHeaderContext.Provider value={context}>
      <div
        className={`app-shell min-h-dvh bg-paper text-ink ${route.kind === 'main' || ownBar ? 'app-shell-with-bottom' : ''}`}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only"
          onClick={(event) => {
            event.preventDefault()
            document.getElementById('main')?.focus()
          }}
        >
          {t('app.skipToContent')}
        </a>
        <AppHeader route={route} options={override?.options} />
        <div className="app-shell-width">
          <OfflineBanner />
        </div>
        <main id="main" tabIndex={-1} className="app-shell-width min-w-0 px-4 py-4 outline-none">
          <Suspense fallback={<SkeletonRows />}>{outlet}</Suspense>
        </main>
        {route.kind === 'main' && (
          <div className="app-shell-nav" onClickCapture={repeatTab}>
            <BottomNav />
          </div>
        )}
        <Toaster />
      </div>
    </ScreenHeaderContext.Provider>
  )
}

/** Wrap route commits so the old screen is still present when the browser takes its snapshot. */
export function AppLayout() {
  useLiveUnreadCounter()
  const location = useLocation()
  const navigation = useNavigationType()
  const outlet = useOutlet()
  const routerContext = useContext(UNSAFE_LocationContext)
  const current = { location, outlet, routerContext }
  const [shown, setShown] = useState(current)
  const pending = useRef<ReturnType<Document['startViewTransition']> | null>(null)
  // Capture router contexts along with the outlet using a location-keyed frame below.
  useLayoutEffect(() => {
    if (shown.location === location) return
    pending.current?.skipTransition()
    const commit = () => setShown(current)
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      commit()
      return
    }
    const tabs =
      resolveScreenRoute(shown.location.pathname).kind === 'main' &&
      resolveScreenRoute(location.pathname).kind === 'main'
    document.documentElement.dataset.appTransition = tabs ? 'tabs' : navigation === 'POP' ? 'back' : 'forward'
    const transition = document.startViewTransition(() => {
      flushSync(commit)
    })
    pending.current = transition
    void transition.finished
      .catch(() => {})
      .finally(() => {
        if (pending.current === transition) {
          delete document.documentElement.dataset.appTransition
          pending.current = null
        }
      })
  })
  return (
    <UNSAFE_LocationContext.Provider value={shown.routerContext}>
      <ScreenFrame outlet={shown.outlet} />
    </UNSAFE_LocationContext.Provider>
  )
}
