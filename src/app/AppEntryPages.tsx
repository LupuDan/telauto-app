import { lazy } from 'react'

// All chunks ship inside the APK, so these imports also work without a connection.
export const HomePage = lazy(() => import('./AppHomePage').then((module) => ({ default: module.AppHomePage })))
export const CategoryPage = lazy(() =>
  import('../pages/CategoryPage').then((module) => ({ default: module.CategoryPage })),
)
export const SearchPage = lazy(() => import('../pages/SearchPage').then((module) => ({ default: module.SearchPage })))
export const ListingPage = lazy(() =>
  import('../pages/ListingPage').then((module) => ({ default: module.ListingPage })),
)
