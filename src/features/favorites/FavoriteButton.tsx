import { IS_APP, haptic } from '../../native'
import { Heart } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import { toast } from '../../lib/toast'
import { useAuth } from '../auth/authContext'
import { useFavoriteIds, useToggleFavorite } from './api'

/**
 * "Salvează": round heart over a photo (card or gallery), 44 × 44 px pressable area.
 * Logged-in users save the listing (the heart pulses once); visitors go to the login page and come back.
 */
export function FavoriteButton({ listingId }: { listingId: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const ids = useFavoriteIds()
  const toggle = useToggleFavorite()
  const saved = ids.data?.has(listingId) ?? false
  const [pulse, setPulse] = useState(0)

  function handleClick() {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`)
      return
    }
    if (!saved) {
      setPulse((value) => value + 1)
      if (IS_APP) haptic('light')
    }
    toggle.mutate({ listingId, save: !saved })
    // "Scos din favorite" with "Anulează" for 5 seconds (plan de design, 6.6)
    if (saved) {
      toast(t('favorites.removedToast'), {
        action: { label: t('common.undo'), onClick: () => toggle.mutate({ listingId, save: true }) },
      })
    }
  }

  const label = saved ? t('favorites.remove') : t('favorites.save')
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className="group/fav flex size-11 items-center justify-center rounded-full"
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-surface/95 text-ink shadow-float group-hover/fav:bg-surface">
        <Heart
          key={pulse}
          aria-hidden="true"
          className={`size-5 ${saved ? 'fill-danger text-danger' : ''} ${
            pulse ? 'animate-[heart-pulse_300ms_ease-out]' : ''
          }`}
          strokeWidth={1.75}
        />
      </span>
    </button>
  )
}
