import { IS_APP, shareLink } from '../native'
import { appBottomPanelClass, useScreenHeader } from '../appshell'
import { CircleCheck, MapPin, Share2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { usePageMeta } from '../app/usePageMeta'
import { ListingGrid } from '../components/ListingCard'
import { Alert } from '../components/ui/Alert'
import { buttonClass } from '../components/ui/buttonStyles'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { SafetyNotice } from '../components/ui/SafetyNotice'
import { TrustBadges } from '../components/ui/TrustBadge'
import { useAuth } from '../features/auth/authContext'
import { FavoriteButton } from '../features/favorites/FavoriteButton'
import { useVehicles, vehicleTitle } from '../features/garage/api'
import {
  countView,
  useListing,
  useListingContact,
  type CompatibilityRow,
  type ListingDetails,
} from '../features/listingPage/api'
import { AttributeList } from '../features/listingPage/AttributeList'
import { ListingGallery } from '../features/listingPage/ListingGallery'
import { ContactActions, PrivateValues, SellerBox } from '../features/listingPage/SellerBox'
import { useLocalities } from '../features/reference/hooks'
import { ReportButton } from '../features/reports/ReportButton'
import { useSearchListings } from '../features/search/api'
import { categoryById, trustBadges, type CategoryConfig } from '../lib/categories'
import { formatListingDate, formatPrice, localizedName } from '../lib/format'
import { getSiteBaseUrl } from '../lib/siteUrl'
import { toast } from '../lib/toast'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function ListingPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const validId = id && UUID_PATTERN.test(id) ? id : undefined
  const listing = useListing(validId)
  const { user, loading: authLoading } = useAuth()

  const data = listing.data
  usePageMeta(
    data ? `${data.title} – Telauto.md` : t('errors.listingNotFound'),
    data ? data.description.slice(0, 160) : undefined,
  )

  // opening another listing (e.g. from "similar") starts at the top
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [validId])

  const isVisibleToAll = data?.status === 'active' && !data.expired
  useEffect(() => {
    if (!data || authLoading || !isVisibleToAll || data.userId === user?.id) return
    void countView(data.id)
  }, [data, authLoading, isVisibleToAll, user?.id])

  if (validId && listing.isPending) return <LoadingState />
  if (listing.isError) return <ErrorState error={listing.error} onRetry={() => void listing.refetch()} />

  const category = data ? categoryById(data.categoryId) : undefined
  if (!data || !category) {
    return (
      <EmptyState
        title={t('errors.listingNotFound')}
        text={t('listing.notFoundText')}
        action={
          <Link to="/" className={buttonClass('secondary')}>
            {t('notFound.backHome')}
          </Link>
        }
      />
    )
  }

  return <ListingView key={data.id} listing={data} category={category} visibleToAll={isVisibleToAll} />
}

/** "Distribuie": the phone's share menu, or the link copied on computers. */
function ShareButton({ title }: { title: string }) {
  const { t } = useTranslation()
  async function share() {
    const url = getSiteBaseUrl() + window.location.hash
    try {
      if (IS_APP) {
        if ((await shareLink({ title, url })) === 'copied') toast(t('listing.linkCopied'))
      } else if (navigator.share) await navigator.share({ title, url })
      else {
        await navigator.clipboard.writeText(url)
        toast(t('listing.linkCopied'))
      }
    } catch {
      // closed the share menu: nothing to do
    }
  }
  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={t('listing.share')}
      title={t('listing.share')}
      className="flex size-11 items-center justify-center rounded-full"
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-surface/95 text-ink shadow-float hover:bg-surface">
        <Share2 aria-hidden="true" className="size-5" strokeWidth={1.75} />
      </span>
    </button>
  )
}

/**
 * Listing page (plan de design, 6.3).
 * Phones, top to bottom: gallery (full width), price + "negociabil", trust badges, title, locality and
 * date, product sheet, description ("Arată tot" after 8 lines), safety panel, seller, similar listings;
 * a bar fixed at the bottom with "Scrie mesaj" and "Arată telefonul".
 * Computers: two columns; the right one (about 35 %) stays in view with price, badges, contact,
 * seller and the safety panel.
 */
function ListingView({
  listing,
  category,
  visibleToAll,
}: {
  listing: ListingDetails
  category: CategoryConfig
  visibleToAll: boolean
}) {
  const { t, i18n } = useTranslation()
  useScreenHeader(IS_APP ? { title: listing.title } : {})
  const lng = i18n.resolvedLanguage
  const localities = useLocalities()
  const locality = localities.data?.find((item) => item.id === listing.localityId)
  const conditionGroup = category.conditionLabels
  const contact = useListingContact(listing.id)
  const { user } = useAuth()
  const isOwner = user?.id === listing.userId

  const summary = (
    <div className="space-y-3">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="type-price-lg text-ink">{formatPrice(listing.price, listing.currency, lng)}</span>
        {listing.negotiable && <span className="text-muted">{t('listing.negotiableShort')}</span>}
      </p>
      <TrustBadges fields={trustBadges(category, listing)} />
      {/* user text: React shows it as plain text, never as HTML */}
      <h1 className="type-h2 break-words text-ink">{listing.title}</h1>
      <div className="type-small text-muted">
        {locality && (
          <p className="flex items-center gap-1">
            <MapPin aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
            {localizedName(locality, lng)}
          </p>
        )}
        <p>
          {formatListingDate(listing.createdAt, lng)} · {t('myListings.views', { count: listing.views })}
        </p>
      </div>
    </div>
  )

  const safety = <SafetyNotice>{t('listing.safetyShort')}</SafetyNotice>

  return (
    <div className="space-y-8">
      <nav aria-label={t('listing.breadcrumb')} className={IS_APP ? 'hidden' : 'hidden text-sm text-muted lg:block'}>
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link to="/" className="hover:text-brand hover:underline">
              {t('listing.home')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to={`/c/${category.slug}`} className="hover:text-brand hover:underline">
              {t(`categories.${category.slug}`)}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="max-w-xs truncate text-ink">
            {listing.title}
          </li>
        </ol>
      </nav>

      {!visibleToAll && (
        <Alert kind="warning">
          {listing.status === 'draft' ? t('listing.notPublicDraft') : t('listing.notPublic')}
        </Alert>
      )}

      <div className={IS_APP ? 'grid gap-6' : 'grid gap-6 lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)] lg:gap-8'}>
        <div className="-mt-6 min-w-0 space-y-6 sm:mt-0 lg:-mt-0">
          <ListingGallery
            photos={listing.photos}
            title={listing.title}
            fallbackIcon={category.icon}
            actions={
              <>
                {!isOwner && <FavoriteButton listingId={listing.id} />}
                <ShareButton title={listing.title} />
              </>
            }
          />

          {/* phones: price and title right under the gallery */}
          <div className={IS_APP ? '' : 'lg:hidden'}>{summary}</div>

          <section aria-labelledby="characteristics-heading" className="space-y-3">
            <h2 id="characteristics-heading" className="type-h2 text-ink">
              {t('listing.characteristics')}
            </h2>
            <AttributeList
              category={category}
              attributes={listing.attributes}
              extraRows={[
                {
                  key: 'condition',
                  label: t('listingForm.condition'),
                  value:
                    listing.condition === 'new'
                      ? t(`listingForm.conditionOptions.${conditionGroup}.new`)
                      : t(`listingForm.conditionOptions.${conditionGroup}.used`),
                },
              ]}
            />
            {listing.compatibility.length > 0 && <Compatibility rows={listing.compatibility} />}
          </section>

          {listing.description && <Description text={listing.description} />}

          <div className={IS_APP ? 'space-y-4' : 'space-y-4 lg:hidden'}>
            {safety}
            <PrivateValues contact={contact} />
            <SellerBox listing={listing} />
          </div>
        </div>

        <aside className={IS_APP ? 'hidden' : 'hidden lg:block'}>
          <div className="space-y-4 lg:sticky lg:top-[5.25rem]">
            <div className="space-y-4 rounded-panel border border-line bg-surface p-5">
              {summary}
              <ContactActions listing={listing} contact={contact} layout="panel" />
              <PrivateValues contact={contact} />
            </div>
            <SellerBox listing={listing} />
            {safety}
          </div>
        </aside>
      </div>

      <SimilarListings listing={listing} category={category} />

      {!isOwner && (
        <div className="border-t border-line pt-2">
          <ReportButton target={{ listingId: listing.id }} />
        </div>
      )}

      {/* phones and tablets: the two contact buttons stay at the bottom of the screen */}
      <div
        className={
          IS_APP
            ? `${appBottomPanelClass} border-t border-line px-4 pt-3 shadow-float`
            : 'fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-float lg:hidden'
        }
      >
        <div className="mx-auto max-w-xl">
          <ContactActions listing={listing} contact={contact} layout="bar" />
        </div>
      </div>
    </div>
  )
}

/** Description, cut after 8 lines with "Arată tot". */
function Description({ text }: { text: string }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLParagraphElement>(null)
  const [open, setOpen] = useState(false)
  const [long, setLong] = useState(false)

  useLayoutEffect(() => {
    const element = ref.current
    if (element && !open) setLong(element.scrollHeight > element.clientHeight + 2)
  }, [text, open])

  return (
    <section aria-labelledby="description-heading" className="space-y-3">
      <h2 id="description-heading" className="type-h2 text-ink">
        {t('listing.description')}
      </h2>
      <p ref={ref} className={`max-w-[72ch] break-words whitespace-pre-line text-ink ${open ? '' : 'line-clamp-8'}`}>
        {text}
      </p>
      {(long || open) && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="inline-flex min-h-11 items-center font-medium text-brand hover:underline"
        >
          {open ? t('listing.showLess') : t('listing.showAll')}
        </button>
      )}
    </section>
  )
}

/** "Se potrivește la" (auto parts) and a green line when a car in the user's garage fits. */
function Compatibility({ rows }: { rows: CompatibilityRow[] }) {
  const { t } = useTranslation()
  const vehicles = useVehicles()
  const allModels = t('listingForm.compatibilityAllModels')
  const match = vehicles.data?.find((vehicle) =>
    rows.some(
      (row) =>
        row.makeId === vehicle.makeId &&
        (row.modelId === null || row.modelId === vehicle.modelId) &&
        vehicle.year >= row.yearFrom &&
        vehicle.year <= row.yearTo,
    ),
  )

  return (
    <div className="space-y-2 pt-2">
      <h3 className="font-semibold text-ink">{t('listing.fitsTitle')}</h3>
      {match && (
        <p className="flex items-start gap-2 rounded-field border border-success-200 bg-success-50 px-3 py-2 text-ink">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" strokeWidth={1.75} />
          {t('listing.fitsMyCar', { car: vehicleTitle(match, allModels) })}
        </p>
      )}
      <ul className="overflow-hidden rounded-card border border-line">
        {rows.map((row, index) => (
          <li key={index} className="flex justify-between gap-3 px-4 py-2.5 odd:bg-surface even:bg-paper">
            <span className="font-medium text-ink">
              {row.makeName} {row.modelName ?? `(${allModels})`}
            </span>
            <span className="text-muted tabular">
              {row.yearFrom}–{row.yearTo}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Same category and, when set, the same brand / make / type (first field of the category). */
function SimilarListings({ listing, category }: { listing: ListingDetails; category: CategoryConfig }) {
  const { t } = useTranslation()
  const firstField = category.fields[0]
  const value = firstField ? listing.attributes[firstField.key] : undefined
  const result = useSearchListings({
    p_category_id: category.id,
    p_exclude_id: listing.id,
    p_limit: 8,
    ...(value !== undefined ? { p_attributes: { [firstField.key]: value } } : {}),
  })

  if (!result.data || result.data.items.length === 0) return null
  return (
    <section aria-labelledby="similar-heading" className="space-y-4">
      <h2 id="similar-heading" className="type-h2 text-ink">
        {t('listing.similar')}
      </h2>
      <ListingGrid listings={result.data.items} />
    </section>
  )
}
