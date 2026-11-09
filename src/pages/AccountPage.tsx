import { IS_APP } from '../native'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, Outlet, useSearchParams } from 'react-router'
import { usePageMeta } from '../app/usePageMeta'
import { Alert } from '../components/ui/Alert'
import { LoadingState } from '../components/ui/LoadingState'
import { AccountHome, AccountSidebar, GuestAccount } from '../features/account/AccountHome'
import { ScreenHeader } from '../features/account/parts'
import { useAuth } from '../features/auth/authContext'
import { FavoritesList } from '../features/favorites/FavoritesList'
import { GarageList } from '../features/garage/GarageList'
import { MyListings } from '../features/listings/MyListings'
import { useIsDesktop } from '../lib/useIsDesktop'

export { DeleteAccountScreen, ProfileScreen, SecurityScreen, SettingsMenu } from '../features/account/SettingsScreens'

/**
 * "Contul meu" (plan de design, 6.6). Every section has its own route, so the phone's back button works:
 *   #/account                 main screen (phones) / "Anunțurile mele" next to the menu (computers)
 *   #/account/listings        #/account/favorites        #/account/garage (category module)
 *   #/account/settings        …/settings/profile, …/settings/security, …/settings/delete
 * Computers (1024 px+): the menu stays in a 280 px column on the left, the section opens on the right.
 */
export function AccountPage() {
  const { user, loading } = useAuth()
  const isDesktop = useIsDesktop() && !IS_APP

  if (loading) return <LoadingState />
  if (!user || !isDesktop) {
    return (
      <>
        <AccountNotices />
        <Outlet />
      </>
    )
  }
  return (
    <div className="grid grid-cols-[280px_minmax(0,1fr)] items-start gap-8">
      <aside className="sticky top-6">
        <AccountSidebar />
      </aside>
      <div className="min-w-0">
        <AccountNotices />
        <Outlet />
      </div>
    </div>
  )
}

/** Old links (#/account?tab=garage) still open the right screen. */
const OLD_TABS = ['listings', 'favorites', 'garage', 'settings']

export function AccountIndex() {
  const { t } = useTranslation()
  usePageMeta(t('account.metaTitle'))
  const { user } = useAuth()
  const isDesktop = useIsDesktop() && !IS_APP
  const [params] = useSearchParams()
  const tab = params.get('tab')

  if (tab && OLD_TABS.includes(tab)) {
    const rest = new URLSearchParams(params)
    rest.delete('tab')
    const query = rest.toString()
    return <Navigate to={`/account/${tab}${query ? `?${query}` : ''}`} replace />
  }
  if (!user) return <GuestAccount />
  return isDesktop ? <ListingsScreen /> : <AccountHome />
}

export function ListingsScreen() {
  const { t } = useTranslation()
  usePageMeta(`${t('account.tabs.listings')} – Telauto.md`)
  const { user } = useAuth()
  return (
    <div>
      <ScreenHeader title={t('account.tabs.listings')} back="/account" />
      {user && <MyListings userId={user.id} />}
    </div>
  )
}

export function FavoritesScreen() {
  const { t } = useTranslation()
  usePageMeta(`${t('account.tabs.favorites')} – Telauto.md`)
  return (
    <div>
      <ScreenHeader title={t('account.tabs.favorites')} back="/account" />
      <FavoritesList />
    </div>
  )
}

export function GarageScreen() {
  const { t } = useTranslation()
  usePageMeta(`${t('account.tabs.garage')} – Telauto.md`)
  return (
    <div className="mx-auto max-w-xl lg:mx-0">
      <ScreenHeader title={t('account.tabs.garage')} back="/account" />
      <GarageList />
    </div>
  )
}

/** Notices after another page sent the person here (published listing, new password). */
function AccountNotices() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const notice = params.get('notice')
  const id = params.get('id') ?? ''

  if (notice === 'password-changed') {
    return (
      <div className="mb-4">
        <Alert kind="success">{t('auth.resetDone')}</Alert>
      </div>
    )
  }
  if (notice !== 'published' && notice !== 'saved') return null
  return (
    <div className="mb-4">
      <Alert kind="success">
        {notice === 'published' ? t('myListings.publishedNotice') : t('myListings.savedNotice')}
        {/^[0-9a-f-]{36}$/i.test(id) && (
          <>
            {' '}
            <Link to={`/a/${id}`} className="font-medium text-brand underline-offset-2 hover:underline">
              {t('myListings.viewListing')}
            </Link>
          </>
        )}
      </Alert>
    </div>
  )
}
