import { House, MessageCircle, Plus, Search, UserRound, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../features/auth/authContext'
import { UnreadBadge } from './UnreadBadge'
import { useMessagesLabel } from './useMessagesLabel'

/** Height of the bar without the phone's safe area; pages keep this much room at the bottom. */
export const BOTTOM_NAV_HEIGHT = 64

type Item = { to: string; label: string; Icon: LucideIcon; active: boolean }

function NavItem({ to, label, Icon, active, badge, ariaLabel }: Item & { badge?: boolean; ariaLabel?: string }) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      className={`relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-field px-1 text-xs leading-4 ${
        active ? 'font-semibold text-brand' : 'text-muted hover:text-ink'
      }`}
    >
      <span className="relative">
        <Icon aria-hidden="true" className="size-6" strokeWidth={active ? 2.1 : 1.75} />
        {badge && <UnreadBadge className="-top-1.5 -right-3" />}
      </span>
      <span className="max-w-full truncate">{label}</span>
    </Link>
  )
}

/**
 * Bar fixed at the bottom on phones and tablets (plan de design, section 4):
 * Acasă, Caută, Adaugă (round yellow button raised above the bar), Mesaje, Cont.
 * Hidden from 1024 px, where the header has these links.
 */
export function BottomNav() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const messagesLabel = useMessagesLabel(t('nav.messages'), (count) => t('messages.unread', { count }))

  const items = {
    home: { to: '/', label: t('nav.home'), Icon: House, active: pathname === '/' },
    search: {
      to: '/search',
      label: t('nav.search'),
      Icon: Search,
      active: pathname === '/search' || pathname.startsWith('/c/'),
    },
    messages: {
      to: '/messages',
      label: t('nav.messages'),
      Icon: MessageCircle,
      active: pathname.startsWith('/messages'),
    },
    account: {
      // without an account 'Cont' opens a short screen with the login and register buttons
      to: '/account',
      label: t('nav.account'),
      Icon: UserRound,
      active: pathname.startsWith('/account') || ['/login', '/register'].includes(pathname),
    },
  }
  const addActive = pathname === '/new'

  return (
    <nav
      aria-label={t('nav.label')}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[var(--app-inset-bottom,env(safe-area-inset-bottom))] shadow-float lg:hidden"
    >
      <div className="mx-auto flex max-w-xl items-stretch px-1" style={{ height: BOTTOM_NAV_HEIGHT }}>
        <NavItem {...items.home} />
        <NavItem {...items.search} />
        <Link
          to="/new"
          aria-current={addActive ? 'page' : undefined}
          className="flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5 pb-1.5 text-xs leading-4 font-semibold text-ink"
        >
          <span className="-mt-5 flex size-14 items-center justify-center rounded-full bg-tag text-on-tag shadow-float ring-4 ring-surface">
            <Plus aria-hidden="true" className="size-7" strokeWidth={2.25} />
          </span>
          <span className="max-w-full truncate">{t('nav.add')}</span>
        </Link>
        <NavItem {...items.messages} badge={Boolean(user)} ariaLabel={messagesLabel} />
        <NavItem {...items.account} />
      </div>
    </nav>
  )
}
