import { useBrowseListings } from '../features/search/api'
import { HomePage } from '../pages/HomePage'
import { OfflineScreen } from '../appshell/Offline'

/** The provider restores disk data before either observer can start a request. */
export function AppHomePage() {
  const latest = useBrowseListings({ p_limit: 12 })
  if (latest.isError && !latest.data) return <OfflineScreen onRetry={() => void latest.refetch()} />
  return <HomePage />
}
