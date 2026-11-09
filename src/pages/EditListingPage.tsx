import { IS_APP } from '../native'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router'
import { usePageMeta } from '../app/usePageMeta'
import { Alert } from '../components/ui/Alert'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { useAuth } from '../features/auth/authContext'
import { useListingForEdit } from '../features/listings/hooks'
import { ListingWizard } from '../features/listings/ListingWizard'
import { translateKey } from '../i18n/translate'

export function EditListingPage() {
  const { t } = useTranslation()
  usePageMeta(t('listingForm.editMetaTitle'))
  const { id } = useParams()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const listing = useListingForEdit(id)

  if (listing.isPending) return <LoadingState />
  if (listing.isError) return <ErrorState error={listing.error} onRetry={() => void listing.refetch()} />

  // only the author edits here (admins moderate from the admin panel)
  if (!listing.data || listing.data.userId !== user?.id) {
    return (
      <section className="mx-auto max-w-md py-12 text-center">
        <h1 className="type-h1 text-ink">{t('errors.listingNotFound')}</h1>
        <Link to="/account/listings" className="mt-6 inline-block font-semibold text-brand hover:underline">
          {t('listingForm.backToMyListings')}
        </Link>
      </section>
    )
  }

  const { data } = listing
  const errorKey = params.get('error')
  const editable = data.status === 'draft' || data.status === 'active' || data.status === 'sold'

  return (
    <div>
      <h1 className={IS_APP ? 'sr-only' : 'mx-auto mb-4 max-w-3xl type-h1 text-ink'}>
        {data.status === 'draft' ? t('listingForm.finishDraftTitle') : t('listingForm.editTitle')}
      </h1>

      {data.status === 'draft' && (
        <div className="mx-auto mb-4 max-w-3xl space-y-2">
          <Alert kind="warning">{t('listingForm.draftNotice')}</Alert>
          {errorKey && <Alert kind="error">{translateKey(t, errorKey)}</Alert>}
        </div>
      )}

      {editable ? (
        <ListingWizard
          key={data.id}
          mode="edit"
          listingId={data.id}
          status={data.status}
          initialValues={data.values}
          initialPhotos={data.photos}
        />
      ) : (
        <div className="mx-auto max-w-3xl">
          <Alert kind="warning">{t('listingForm.notEditable')}</Alert>
        </div>
      )}
    </div>
  )
}
