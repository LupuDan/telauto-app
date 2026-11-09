import { MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useAuth } from '../features/auth/authContext'
import { FavoriteButton } from '../features/favorites/FavoriteButton'
import { cardFacts } from '../features/listings/attributeDisplay'
import { publicPhotoUrl } from '../features/listings/photos'
import { useLocalities } from '../features/reference/hooks'
import type { ListingSummary } from '../features/search/api'
import { categoryById, trustBadges, type CategoryConfig } from '../lib/categories'
import { formatListingDate, formatPrice, localizedName } from '../lib/format'
import { CategoryIcon } from './CategoryIcon'
import { TrustBadges } from './ui/TrustBadge'

/**
 * Result card (plan de design, section 5): 4:3 photo with the heart in the corner, price, title on
 * at most 2 lines, up to 3 spec pills (category keySpecs), locality and date on separate lines.
 * No shadow and no hover effect: a 1 px outline only.
 * preview: shown in the listing form (step "Publicare"), not a link and without the heart.
 * categoryConfig: only for #/styleguide, to show a test category that is not in categories.ts.
 * coverUrl: photo not uploaded yet (preview in the listing form).
 */
export function ListingCard({
  listing,
  preview = false,
  categoryConfig,
  coverUrl,
}: {
  listing: ListingSummary
  preview?: boolean
  categoryConfig?: CategoryConfig
  coverUrl?: string
}) {
  const { t, i18n } = useTranslation()
  const lng = i18n.resolvedLanguage
  const localities = useLocalities()
  const category = categoryConfig ?? categoryById(listing.categoryId)
  const locality = localities.data?.find((item) => item.id === listing.localityId)
  const facts = category ? cardFacts(t, category, listing.attributes, lng) : []
  const badges = category ? trustBadges(category, listing) : []
  const { user } = useAuth()
  const isOwn = user?.id === listing.userId

  const content = (
    <>
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-paper">
        {coverUrl || listing.coverPath ? (
          <img
            src={coverUrl ?? publicPhotoUrl(listing.coverPath ?? '')}
            alt=""
            width={400}
            height={300}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          category && (
            <span className="absolute inset-0 flex items-center justify-center text-muted">
              <CategoryIcon name={category.icon} className="size-10" />
            </span>
          )
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="type-price text-ink">
          {formatPrice(listing.price, listing.currency, lng)}
          {listing.negotiable && <span className="sr-only">, {t('listingForm.negotiable')}</span>}
        </p>
        <TrustBadges fields={badges} />
        {/* user text: React shows it as plain text */}
        <h3 className="line-clamp-2 text-[15px] leading-5 font-medium break-words text-ink">{listing.title}</h3>
        {facts.length > 0 && (
          <ul className="flex flex-wrap gap-1" aria-label={t('listing.characteristics')}>
            {facts.map((fact) => (
              <li
                key={fact}
                className="max-w-full truncate rounded-full bg-paper px-2 py-0.5 type-micro text-ink tabular"
              >
                {fact}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto pt-1 type-small text-muted">
          {locality && (
            <p className="flex min-w-0 items-center gap-1">
              <MapPin aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{localizedName(locality, lng)}</span>
            </p>
          )}
          <p>{formatListingDate(listing.createdAt, lng)}</p>
        </div>
      </div>
    </>
  )

  const boxClass = 'flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface'

  if (preview) return <div className={boxClass}>{content}</div>

  return (
    <div className="relative h-full">
      <Link to={`/a/${listing.id}`} className={boxClass}>
        {content}
      </Link>
      {!isOwn && (
        <div className="absolute top-1 right-1">
          <FavoriteButton listingId={listing.id} />
        </div>
      )}
    </div>
  )
}

export function ListingGrid({ listings, columns = 4 }: { listings: ListingSummary[]; columns?: 3 | 4 }) {
  return (
    <ul className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 ${columns === 4 ? 'lg:grid-cols-4' : ''}`}>
      {listings.map((listing) => (
        <li key={listing.id}>
          <ListingCard listing={listing} />
        </li>
      ))}
    </ul>
  )
}

/** Grey shapes that imitate the cards while the results load (never a blank screen). */
export function ListingGridSkeleton({ count = 8, columns = 4 }: { count?: number; columns?: 3 | 4 }) {
  return (
    <ul
      aria-hidden="true"
      className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 ${columns === 4 ? 'lg:grid-cols-4' : ''}`}
    >
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="aspect-[4/3] animate-pulse bg-slate-100" />
          <div className="space-y-2 p-3">
            <div className="h-5 w-1/2 animate-pulse rounded-full bg-slate-100" />
            <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
            <div className="flex gap-1">
              <div className="h-4 w-12 animate-pulse rounded-full bg-slate-100" />
              <div className="h-4 w-16 animate-pulse rounded-full bg-slate-100" />
            </div>
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-100" />
          </div>
        </li>
      ))}
    </ul>
  )
}
