import { IS_APP } from '../native'
import { useScreenHeader } from '../appshell'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { usePageMeta } from '../app/usePageMeta'
import { ListingGrid, ListingGridSkeleton } from '../components/ListingCard'
import { buttonClass } from '../components/ui/buttonStyles'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { Avatar } from '../components/ui/Avatar'
import { avatarUrl } from '../features/profile/api'
import { useProfile } from '../features/profile/hooks'
import { useLocalities } from '../features/reference/hooks'
import { useSearchListings } from '../features/search/api'
import { formatMonthYear, localizedName } from '../lib/format'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function PublicProfilePage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const validId = id && UUID_PATTERN.test(id) ? id : undefined
  const profile = useProfile(validId)
  const localities = useLocalities()

  const name = profile.data?.display_name || t('profile.unnamed')
  useScreenHeader(IS_APP ? { title: name } : {})
  usePageMeta(profile.data ? t('profile.metaTitle', { name }) : t('profile.notFoundTitle'))

  if (validId && profile.isPending) return <LoadingState />
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />

  if (!validId || !profile.data) {
    return (
      <EmptyState
        title={t('profile.notFoundTitle')}
        text={t('profile.notFoundText')}
        action={
          <Link to="/" className={buttonClass('secondary')}>
            {t('notFound.backHome')}
          </Link>
        }
      />
    )
  }

  const data = profile.data
  const locality = localities.data?.find((item) => item.id === data.locality_id)

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {!IS_APP && <BackButton />}
      <section className="flex items-center gap-4 rounded-card border border-line bg-surface p-5">
        <Avatar name={name} src={avatarUrl(data.avatar_path)} size="2xl" />
        <div className="min-w-0">
          {/* user text is rendered as plain text by React (no HTML) */}
          <h1 className={IS_APP ? 'sr-only' : 'truncate type-h1 text-ink'}>{name}</h1>
          <p className="text-sm text-muted">
            {locality ? localizedName(locality, i18n.resolvedLanguage) : t('profile.noLocality')}
          </p>
          <p className="text-sm text-muted">
            {t('profile.memberSince', { date: formatMonthYear(data.created_at, i18n.resolvedLanguage) })}
          </p>
          {data.is_blocked && <p className="mt-1 text-sm font-semibold text-danger">{t('profile.blocked')}</p>}
        </div>
      </section>

      <section aria-labelledby="profile-listings" className="pt-2">
        <h2 id="profile-listings" className="mb-3 type-h2 text-ink">
          {t('profile.listingsHeading')}
        </h2>
        <ProfileListings userId={data.id} />
      </section>
    </div>
  )
}

function ProfileListings({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const listings = useSearchListings({ p_user_id: userId, p_limit: 48 })

  if (listings.isPending) return <ListingGridSkeleton count={4} />
  if (listings.isError) return <ErrorState error={listings.error} onRetry={() => void listings.refetch()} />
  if (listings.data.items.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line-strong bg-surface p-6 text-center text-muted">
        {t('profile.noListings')}
      </p>
    )
  }
  return <ListingGrid listings={listings.data.items} />
}

/** "‹ Înapoi": to the previous page (e.g. "Contul meu" or the listing); to the home page if opened from a link. */
function BackButton() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const hasHistory = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0
  return (
    <button
      type="button"
      onClick={() => (hasHistory ? navigate(-1) : navigate('/'))}
      className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-field pr-3 pl-1 font-medium text-ink hover:bg-surface"
    >
      <ChevronLeft aria-hidden="true" className="size-6" strokeWidth={2} />
      {t('common.back')}
    </button>
  )
}
