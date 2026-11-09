import { Mail, Plus, Settings, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useSearchParams } from 'react-router'
import { useAuth } from '../features/auth/authContext'
import { useProfile } from '../features/profile/hooks'
import { IS_APP } from '../native/platform'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Logo } from './Logo'
import { SearchBar } from './SearchBar'
import { ThemeToggle } from './ThemeToggle'
import { buttonClass } from './ui/buttonStyles'
import { UnreadBadge } from './UnreadBadge'
import { useMessagesLabel } from './useMessagesLabel'

/** Square icon button of the header (44 × 44 px). */
export const headerIconClass =
  'relative inline-flex size-11 shrink-0 items-center justify-center rounded-field text-ink hover:bg-paper'

/** Shown only to admins (the panel itself is protected by the database). Computers only. */
function AdminLink({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const profile = useProfile(userId)
  if (IS_APP || profile.data?.role !== 'admin') return null
  return (
    <Link to="/admin" aria-label={t('header.admin')} title={t('header.admin')} className={headerIconClass}>
      <Settings aria-hidden="true" className="size-5" strokeWidth={1.75} />
    </Link>
  )
}

function MessagesLink() {
  const { t } = useTranslation()
  const label = useMessagesLabel(t('header.messages'), (count) => t('messages.unread', { count }))
  return (
    <Link to="/messages" aria-label={label} title={t('header.messages')} className={headerIconClass}>
      <Mail aria-hidden="true" className="size-5" strokeWidth={1.75} />
      <UnreadBadge className="top-0.5 right-0" />
    </Link>
  )
}

/**
 * Phones: hide the header while scrolling down, bring it back when scrolling up (plan de design, 4).
 * Not while something inside the header has focus (e.g. typing in the search box).
 */
function useHideOnScroll(ref: React.RefObject<HTMLElement | null>) {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    const phone = window.matchMedia('(max-width: 639px)')
    let last = window.scrollY
    function onScroll() {
      const y = window.scrollY
      const height = ref.current?.offsetHeight ?? 0
      const focused = ref.current?.contains(document.activeElement) ?? false
      if (!phone.matches || focused || y < height) setHidden(false)
      else if (Math.abs(y - last) > 6) setHidden(y > last)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [ref])
  return [hidden, setHidden] as const
}

export function Header() {
  const { t } = useTranslation()
  const { user, loading } = useAuth()
  const [params] = useSearchParams()
  const searchQuery = params.get('q') ?? ''
  // the home page has its own big search box: phones do not need a second one in the header
  const isHome = useLocation().pathname === '/'
  const ref = useRef<HTMLElement>(null)
  const [hidden, setHidden] = useHideOnScroll(ref)

  return (
    <header
      ref={ref}
      onFocusCapture={() => setHidden(false)}
      className={`sticky top-0 z-30 border-b border-line bg-surface transition-transform duration-200 ${
        hidden ? '-translate-y-full' : ''
      }`}
    >
      {/*
        under 640 px: row 1 = compact logo + language; row 2 = search (the rest is in the bottom bar)
        640–1023 px: logo, search, language, account (one row)
        1024 px +:   logo, wide search, "Adaugă anunț", messages, account, language
      */}
      <div className="mx-auto flex max-w-page flex-wrap items-center gap-x-2 gap-y-2 px-4 py-2 sm:flex-nowrap sm:gap-x-3 md:px-6 lg:py-3">
        <Link
          to="/"
          aria-label={t('header.homeLink')}
          className="mr-auto flex min-h-11 shrink-0 items-center rounded-logo sm:mr-0"
        >
          {/* the wrappers decide which logo shows (the logo itself is always inline-flex) */}
          <span className="sm:hidden">
            <Logo variant="compact" />
          </span>
          <span className="hidden sm:block">
            <Logo variant="full" />
          </span>
        </Link>

        <div
          className={`order-last w-full sm:order-none sm:block sm:w-auto sm:min-w-0 sm:flex-1 lg:max-w-xl ${isHome ? 'hidden' : ''}`}
        >
          {/* key: the box shows the new words after every search (also searches started elsewhere) */}
          <SearchBar key={searchQuery} />
        </div>

        <div className="flex shrink-0 items-center gap-1 lg:ml-auto">
          {!loading && (
            <span className="hidden lg:contents">
              <Link to="/new" className={`${buttonClass('action', 'compact')} mr-1 whitespace-nowrap`}>
                <Plus aria-hidden="true" className="size-5" strokeWidth={2} />
                {t('header.addListing')}
              </Link>
            </span>
          )}
          {!loading && user && (
            <span className="hidden lg:contents">
              <MessagesLink />
              <AdminLink userId={user.id} />
            </span>
          )}
          {!loading && (
            <span className="hidden sm:contents">
              <Link
                to={user ? '/account' : '/login'}
                aria-label={user ? t('header.account') : t('header.login')}
                title={user ? t('header.account') : t('header.login')}
                className={headerIconClass}
              >
                <UserRound aria-hidden="true" className="size-5" strokeWidth={1.75} />
              </Link>
            </span>
          )}
          <LanguageSwitcher />
          <span className="hidden sm:contents">
            <ThemeToggle />
          </span>
        </div>
      </div>
    </header>
  )
}
