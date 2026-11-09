import { IS_APP, openExternal } from '../../native'
import { Pencil, Phone } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { buttonClass } from '../../components/ui/buttonStyles'
import { Sheet } from '../../components/ui/Sheet'
import { translateKey } from '../../i18n/translate'
import { formatMonthYear } from '../../lib/format'
import { toast } from '../../lib/toast'
import { useAuth } from '../auth/authContext'
import { errorToKey } from '../auth/authErrors'
import { MessageButton } from '../messages/MessageButton'
import { avatarUrl } from '../profile/api'
import { useSearchListings } from '../search/api'
import type { ListingDetails, useListingContact } from './api'

type Contact = ReturnType<typeof useListingContact>

/**
 * Seller box (plan de design, 6.3): avatar, name, "Pe Telauto.md din martie 2026",
 * number of active listings and the link to the profile.
 */
export function SellerBox({ listing }: { listing: ListingDetails }) {
  const { t, i18n } = useTranslation()
  const seller = listing.seller
  const sellerName = seller?.displayName || t('profile.unnamed')
  const active = useSearchListings({ p_user_id: listing.userId, p_limit: 1 })

  return (
    <section aria-label={t('listing.sellerTitle')} className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <Avatar name={sellerName} src={avatarUrl(seller?.avatarPath)} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{sellerName}</p>
          {seller && (
            <p className="text-sm text-muted">
              {t('profile.memberSince', { date: formatMonthYear(seller.createdAt, i18n.resolvedLanguage) })}
            </p>
          )}
          {active.data && active.data.total > 0 && (
            <p className="text-sm text-muted tabular">{t('listing.activeListings', { count: active.data.total })}</p>
          )}
        </div>
      </div>
      <Link
        to={`/u/${listing.userId}`}
        className="mt-2 inline-flex min-h-11 items-center font-medium text-brand hover:underline"
      >
        {t('listing.sellerProfile')}
      </Link>
    </section>
  )
}

/**
 * "Scrie mesaj" (primary) and "Arată telefonul" (secondary), two equal buttons.
 * Phones: in the bar fixed at the bottom; computers: in the panel on the right.
 * Visitors who press "Arată telefonul" get a short window: "Intră în cont ca să vezi numărul".
 * The owner sees "Editează" instead.
 */
export function ContactActions({
  listing,
  contact,
  layout,
}: {
  listing: ListingDetails
  contact: Contact
  layout: 'bar' | 'panel'
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const isOwner = user?.id === listing.userId
  const privateLabel = listing.hasImei ? 'IMEI' : listing.hasVin ? 'VIN' : null
  const next = encodeURIComponent(`/a/${listing.id}`)
  const grid = layout === 'bar' ? 'grid grid-cols-2 gap-2' : 'grid gap-2'
  // narrow phones: the two half-width buttons drop their icons and side padding so Russian texts fit
  const tight = layout === 'bar' ? 'max-[419px]:px-2 max-[419px]:text-[15px] max-[419px]:[&_svg.lucide]:hidden' : ''

  if (isOwner) {
    return (
      <Link to={`/a/${listing.id}/edit`} className={buttonClass('primary', 'normal', true)}>
        <Pencil aria-hidden="true" className="size-5" strokeWidth={1.75} />
        {t('myListings.edit')}
      </Link>
    )
  }

  function showPhone() {
    if (!user) {
      setLoginOpen(true)
      return
    }
    contact.mutate(undefined, { onError: (error) => toast(translateKey(t, errorToKey(error))) })
  }

  const phone = contact.data?.phone
  return (
    <>
      <div className={grid}>
        <MessageButton listingId={listing.id} className={tight} />
        {contact.data ? (
          phone ? (
            <a
              onClick={
                IS_APP
                  ? (event) => {
                      event.preventDefault()
                      openExternal(`tel:${phone}`)
                    }
                  : undefined
              }
              href={`tel:${phone}`}
              className={`${buttonClass('secondary', 'normal', true)} tabular whitespace-nowrap ${tight}`}
            >
              <Phone aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
              {IS_APP ? t('appShell.call') : phone}
            </a>
          ) : (
            <p className="flex items-center text-sm text-muted">{t('listing.noPhone')}</p>
          )
        ) : (
          <Button variant="secondary" fullWidth loading={contact.isPending} onClick={showPhone} className={tight}>
            <Phone aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{t('listing.showPhone')}</span>
          </Button>
        )}
      </div>

      <Sheet
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        title={
          privateLabel ? t('listing.loginModalTitlePrivate', { field: privateLabel }) : t('listing.loginModalTitle')
        }
      >
        <p className="text-muted">
          {privateLabel ? t('listing.loginHintPrivate', { field: privateLabel }) : t('listing.loginHint')}
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Link to={`/login?next=${next}`} className={buttonClass('primary', 'normal', true)}>
            {t('header.login')}
          </Link>
          <Link to={`/register?next=${next}`} className={buttonClass('secondary', 'normal', true)}>
            {t('listing.createAccount')}
          </Link>
        </div>
      </Sheet>
    </>
  )
}

/** IMEI / VIN after "Arată telefonul" (logged-in users only; the database checks it). */
export function PrivateValues({ contact }: { contact: Contact }) {
  if (!contact.data || (!contact.data.imei && !contact.data.vin)) return null
  return (
    <div className="space-y-2" aria-live="polite">
      {contact.data.imei && <PrivateValue label="IMEI" value={contact.data.imei} />}
      {contact.data.vin && <PrivateValue label="VIN" value={contact.data.vin} />}
    </div>
  )
}

function PrivateValue({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-2 rounded-field bg-paper px-3 py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-mono font-semibold break-all text-ink select-all">{value}</span>
    </p>
  )
}
