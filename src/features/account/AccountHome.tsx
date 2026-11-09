import { useScreenHeader } from '../../appshell'
import { AboutApp } from './AboutApp'
import { Car, Heart, LifeBuoy, LogOut, Settings, ShieldCheck, Tag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { Logo } from '../../components/Logo'
import { Alert } from '../../components/ui/Alert'
import { Avatar } from '../../components/ui/Avatar'
import { buttonClass } from '../../components/ui/buttonStyles'
import { useLocalities } from '../reference/hooks'
import { localizedName } from '../../lib/format'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { signOut } from '../auth/api'
import { useAuth } from '../auth/authContext'
import { avatarUrl } from '../profile/api'
import { useProfile, useUpdateMyLanguage } from '../profile/hooks'
import { IS_APP } from '../../native/platform'
import { MenuList, MenuRow } from './parts'
import { HAS_GARAGE, useAccountSummary } from './useAccountSummary'

/**
 * Main screen of "Contul meu" on phones and tablets (plan de design, 6.6): profile header,
 * three quick numbers, the list of sections, the language switch and "Ieși din cont" apart.
 */
export function AccountHome() {
  const { t } = useTranslation()
  useScreenHeader(IS_APP ? { title: t('nav.account') } : {})
  const { user } = useAuth()
  const profile = useProfile(user?.id)

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className={IS_APP ? 'sr-only' : 'type-h1 text-ink'}>{t('account.title')}</h1>
      {profile.data?.is_blocked && <Alert kind="warning">{t('account.blockedNotice')}</Alert>}
      <ProfileHeader />
      <QuickStats />
      <SectionsMenu />
      {!IS_APP && <LanguageRow />}
      <LogoutButton />
      {IS_APP && (
        <AboutApp>
          <LanguageRow />
        </AboutApp>
      )}
    </div>
  )
}

/** Computers (1024 px+): column of 280 px on the left with the profile header and the sections. */
export function AccountSidebar() {
  return (
    <div className="space-y-4">
      <ProfileHeader />
      <SectionsMenu />
      <LogoutButton />
    </div>
  )
}

function ProfileHeader() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const profile = useProfile(user?.id)
  const localities = useLocalities()
  if (!user) return null

  const name = profile.data?.display_name || t('profile.unnamed')
  const locality = localities.data?.find((item) => item.id === profile.data?.locality_id)

  return (
    <div className="flex items-center gap-3">
      {/* pressing the photo opens the profile settings */}
      <Link to="/account/settings/profile" aria-label={t('account.editProfile')} className="shrink-0 rounded-full">
        <Avatar name={name} src={avatarUrl(profile.data?.avatar_path)} size="xl" />
      </Link>
      <div className="min-w-0">
        {/* user text: React shows it as plain text */}
        <p className="truncate font-semibold text-ink">{profile.data ? name : '…'}</p>
        {locality && <p className="truncate text-sm text-muted">{localizedName(locality, i18n.resolvedLanguage)}</p>}
        <Link
          to={`/u/${user.id}`}
          className="inline-flex min-h-8 items-center text-sm font-medium text-brand hover:underline"
        >
          {t('account.publicProfileLink')}
        </Link>
      </div>
    </div>
  )
}

/**
 * Three small tiles: active listings, listings that expire in the next 3 days, favorites.
 * The "expiră" tile turns yellow when the number is above zero; at zero the number is grey.
 */
function QuickStats() {
  const { t } = useTranslation()
  const summary = useAccountSummary()
  const tiles = [
    { to: '/account/listings?f=active', value: summary.active, label: t('account.statActive'), warn: false },
    { to: '/account/listings?f=expiring', value: summary.expiring, label: t('account.statExpiring'), warn: true },
    { to: '/account/favorites', value: summary.favorites, label: t('account.statFavorites'), warn: false },
  ]
  return (
    <nav aria-label={t('account.statsLabel')}>
      <ul className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => {
          const highlighted = tile.warn && (tile.value ?? 0) > 0
          return (
            <li key={tile.to}>
              <Link
                to={tile.to}
                className={`flex min-h-18 flex-col items-center justify-center rounded-card border px-1 py-2 text-center ${
                  highlighted ? 'border-tag-600 bg-tag-50' : 'border-line bg-surface hover:bg-paper'
                }`}
              >
                <span className={`type-price tabular ${tile.value ? 'text-ink' : 'text-muted'}`}>
                  {tile.value ?? '–'}
                </span>
                <span className="max-w-full truncate text-sm text-muted">{tile.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function SectionsMenu() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const profile = useProfile(user?.id)
  const summary = useAccountSummary()
  const isDesktop = useIsDesktop()
  // on computers "/account" shows "Anunțurile mele" on the right; on phones no row is marked
  const isActive = (path: string) =>
    isDesktop && (pathname.startsWith(path) || (path === '/account/listings' && pathname === '/account'))

  return (
    <MenuList label={t('account.sectionsLabel')}>
      <MenuRow
        to="/account/listings"
        Icon={Tag}
        label={t('account.tabs.listings')}
        count={summary.active}
        active={isActive('/account/listings')}
      />
      <MenuRow
        to="/account/favorites"
        Icon={Heart}
        label={t('account.tabs.favorites')}
        count={summary.favorites}
        active={isActive('/account/favorites')}
      />
      {/* category modules come from the configuration, between "Favorite" and "Setări" */}
      {HAS_GARAGE && (
        <MenuRow
          to="/account/garage"
          Icon={Car}
          label={t('account.tabs.garage')}
          count={summary.vehicles}
          active={isActive('/account/garage')}
        />
      )}
      <MenuRow
        to="/account/settings"
        Icon={Settings}
        label={t('account.settings.title')}
        active={isActive('/account/settings')}
      />
      {!IS_APP && profile.data?.role === 'admin' && (
        <MenuRow to="/admin" Icon={ShieldCheck} label={t('admin.openPanel')} />
      )}
      <MenuRow to="/p/help" Icon={LifeBuoy} label={t('account.help')} />
    </MenuList>
  )
}

/** "Limba [RO | RU]": changes at once; for logged-in users it is also saved in the profile. */
function LanguageRow() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const saveLanguage = useUpdateMyLanguage(user?.id)
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 rounded-card border border-line bg-surface px-4">
      <span className="text-ink">{t('language.label')}</span>
      <LanguageSwitcher onChange={(lng) => user && saveLanguage.mutate(lng)} />
    </div>
  )
}

/** Apart from the other rows, so it is not pressed by mistake. */
function LogoutButton() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => void signOut().then(() => navigate('/account', { replace: true }))}
        className="flex min-h-14 w-full items-center gap-3 rounded-card border border-line bg-surface px-4 text-left text-danger hover:bg-paper"
      >
        <LogOut aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
        {t('auth.logout')}
      </button>
    </div>
  )
}

/** "Cont" without an account: the tag logo, one sentence, two buttons, then language and help. */
export function GuestAccount() {
  const { t } = useTranslation()
  useScreenHeader(IS_APP ? { title: t('nav.account') } : {})
  const next = encodeURIComponent('/account')
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex flex-col items-center px-4 pt-6 text-center">
        <Logo variant="icon" className="size-14" />
        <h1 className={IS_APP ? 'sr-only' : 'mt-4 type-h1 text-ink'}>{t('account.title')}</h1>
        <p className="mt-2 text-muted">{t('account.guestText')}</p>
        <div className="mt-6 grid w-full gap-2">
          <Link to={`/login?next=${next}`} className={buttonClass('primary', 'normal', true)}>
            {t('header.login')}
          </Link>
          <Link to="/register" className={buttonClass('secondary', 'normal', true)}>
            {t('account.guestRegister')}
          </Link>
        </div>
      </div>
      {IS_APP ? (
        <AboutApp>
          <LanguageRow />
        </AboutApp>
      ) : (
        <LanguageRow />
      )}
      {!IS_APP && (
        <MenuList>
          <MenuRow to="/p/help" Icon={LifeBuoy} label={t('account.help')} />
        </MenuList>
      )}
    </div>
  )
}
