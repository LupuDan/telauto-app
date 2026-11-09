import { Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { matchPath, Outlet, useLocation } from 'react-router'
import { BottomNav } from '../components/BottomNav'
import { CookieBanner } from '../components/CookieBanner'
import { IS_APP } from '../native/platform'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { LoadingState } from '../components/ui/LoadingState'
import { Toaster } from '../components/ui/Toaster'
import { useLiveUnreadCounter } from '../features/messages/api'

/** Pages with their own bar at the bottom of the phone screen hide the main bottom bar. */
const PAGES_WITHOUT_BOTTOM_NAV = ['/messages/:id', '/a/:id', '/new', '/a/:id/edit']
/** ...and of those, the ones whose bar covers the end of the page need the same free room at the bottom. */
const PAGES_WITH_OWN_BAR = ['/a/:id', '/new', '/a/:id/edit']

export function Layout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  // one live connection for the unread counter (header and bottom bar read the same number)
  useLiveUnreadCounter()
  const showBottomNav = !PAGES_WITHOUT_BOTTOM_NAV.some((pattern) => matchPath(pattern, pathname))
  const ownBar = PAGES_WITH_OWN_BAR.some((pattern) => matchPath(pattern, pathname))

  // Start every new page at the top, like a normal website.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div
      className={`flex min-h-dvh flex-col ${
        showBottomNav || ownBar ? 'pb-[calc(4.5rem+var(--app-inset-bottom,env(safe-area-inset-bottom)))] lg:pb-0' : ''
      }`}
    >
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-field focus:bg-surface focus:px-3 focus:py-2 focus:shadow-float"
      >
        {t('app.skipToContent')}
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-page flex-1 px-4 py-6 outline-none md:px-6">
        {/* pages that are downloaded on first use (see App.tsx) show a spinner meanwhile */}
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      {showBottomNav && <BottomNav />}
      {/* The app keeps its data in the app itself: the website storage notice is not needed. */}
      {!IS_APP && <CookieBanner aboveBottomNav={showBottomNav} />}
      <Toaster />
    </div>
  )
}
