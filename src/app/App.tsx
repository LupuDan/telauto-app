import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, type ComponentType } from 'react'
import { HashRouter, Route, Routes } from 'react-router'
import { AuthProvider } from '../features/auth/AuthProvider'
import { RequireAuth } from '../features/auth/RequireAuth'
import { IS_APP } from '../native/platform'
import { CategoryPage } from '../pages/CategoryPage'
import { HomePage } from '../pages/HomePage'
import { ListingPage } from '../pages/ListingPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { SearchPage } from '../pages/SearchPage'
import { HAS_GARAGE } from '../lib/categories'
import { Layout } from './Layout'
import { AppLayout } from '../appshell'

// The pages most visitors open (home, category, search, listing) are in the main file.
// The others are downloaded only when opened, so the first visit on a phone is faster.
// (Layout shows a spinner while they load, see <Suspense> there.)
// After a new version is published, a tab opened before may ask for files that no longer exist:
// then the page is reloaded once to get the new version.
const RELOAD_KEY = 'telauto.chunkReload'

const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() =>
    load().then(
      (module) => {
        sessionStorage.removeItem(RELOAD_KEY)
        return { default: module[name] }
      },
      (error: unknown) => {
        if (!sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, '1')
          window.location.reload()
        }
        throw error
      },
    ),
  )

const accountModule = () => import('../pages/AccountPage')
const AccountPage = page(accountModule, 'AccountPage')
const AccountIndex = page(accountModule, 'AccountIndex')
const ListingsScreen = page(accountModule, 'ListingsScreen')
const FavoritesScreen = page(accountModule, 'FavoritesScreen')
const GarageScreen = page(accountModule, 'GarageScreen')
const SettingsMenu = page(accountModule, 'SettingsMenu')
const ProfileScreen = page(accountModule, 'ProfileScreen')
const SecurityScreen = page(accountModule, 'SecurityScreen')
const DeleteAccountScreen = page(accountModule, 'DeleteAccountScreen')
const AdminPage = page(() => import('../pages/AdminPage'), 'AdminPage')
const AuthConfirmPage = page(() => import('../pages/AuthConfirmPage'), 'AuthConfirmPage')
const ConversationPage = page(() => import('../pages/ConversationPage'), 'ConversationPage')
const EditListingPage = page(() => import('../pages/EditListingPage'), 'EditListingPage')
const LoginPage = page(() => import('../pages/LoginPage'), 'LoginPage')
const MessagesPage = page(() => import('../pages/MessagesPage'), 'MessagesPage')
const NewListingPage = page(() => import('../pages/NewListingPage'), 'NewListingPage')
const PublicProfilePage = page(() => import('../pages/PublicProfilePage'), 'PublicProfilePage')
const RegisterPage = page(() => import('../pages/RegisterPage'), 'RegisterPage')
const ResetPage = page(() => import('../pages/ResetPage'), 'ResetPage')
const StaticPage = page(() => import('../pages/StaticPage'), 'StaticPage')
// design check page, only while developing (npm run dev); not part of the published site
const StyleguidePage = import.meta.env.DEV ? page(() => import('../pages/StyleguidePage'), 'StyleguidePage') : null

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* HashRouter (#/...) because GitHub Pages cannot serve SPA routes on reload. */}
        <HashRouter>
          <Routes>
            {/* the Android app has its own shell (headers per screen, bottom bar on main screens): PLAN_DESIGN_APP.md */}
            <Route element={IS_APP ? <AppLayout /> : <Layout />}>
              <Route index element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset" element={<ResetPage />} />
              <Route path="/auth/confirm" element={<AuthConfirmPage />} />
              <Route path="/u/:id" element={<PublicProfilePage />} />
              <Route path="/c/:slug" element={<CategoryPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/a/:id" element={<ListingPage />} />
              <Route path="/p/:page" element={<StaticPage />} />
              {StyleguidePage && <Route path="/styleguide" element={<StyleguidePage />} />}

              {/* "Contul meu": the main screen also works without an account (login / register) */}
              <Route path="/account" element={<AccountPage />}>
                <Route index element={<AccountIndex />} />
                <Route element={<RequireAuth />}>
                  <Route path="listings" element={<ListingsScreen />} />
                  <Route path="favorites" element={<FavoritesScreen />} />
                  {HAS_GARAGE && <Route path="garage" element={<GarageScreen />} />}
                  <Route path="settings" element={<SettingsMenu />} />
                  <Route path="settings/profile" element={<ProfileScreen />} />
                  <Route path="settings/security" element={<SecurityScreen />} />
                  <Route path="settings/delete" element={<DeleteAccountScreen />} />
                </Route>
              </Route>

              <Route element={<RequireAuth />}>
                <Route path="/new" element={<NewListingPage />} />
                <Route path="/a/:id/edit" element={<EditListingPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/messages/:id" element={<ConversationPage />} />
                {/* The admin panel stays on the website only. */}
                {!IS_APP && <Route path="/admin" element={<AdminPage />} />}
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
