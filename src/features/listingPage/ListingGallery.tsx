import { IS_APP, useBackHandler, useAllowRotation } from '../../native'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CategoryIcon } from '../../components/CategoryIcon'
import type { CategoryIconName } from '../../lib/categories'
import { publicPhotoUrl } from '../listings/photos'

/**
 * Photo gallery (plan de design, section 5): swipe with the finger (CSS scroll-snap), position dots,
 * arrows on computers, a full-screen view (native <dialog>: Esc closes it, arrow keys change photo).
 * `actions` sit over the photo, top right ("Salvează", "Distribuie").
 * Phones: the gallery uses the whole screen width.
 */
export function ListingGallery({
  photos,
  title,
  fallbackIcon,
  actions,
}: {
  photos: string[]
  title: string
  fallbackIcon: CategoryIconName
  actions?: ReactNode
}) {
  const { t } = useTranslation()
  const [index, updateIndex] = useState(0)
  const stripRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const gesture = useRef({ x: 0, y: 0, distance: 0, zoom: 1, panX: 0, panY: 0, pinched: false })
  useBackHandler(() => {
    dialogRef.current?.close()
    return true
  }, IS_APP && open)
  useAllowRotation(IS_APP && open)
  const setIndex = useCallback((next: number | ((value: number) => number)) => {
    updateIndex(next)
    if (IS_APP) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
    }
  }, [])
  const alt = (n: number) => t('listing.photoAlt', { n: n + 1, total: photos.length, title })

  function goTo(next: number) {
    const target = Math.max(0, Math.min(photos.length - 1, next))
    const strip = stripRef.current
    if (strip) strip.scrollTo({ left: target * strip.clientWidth, behavior: 'smooth' })
    setIndex(target)
  }

  // keep the dots right while swiping
  function handleScroll() {
    const strip = stripRef.current
    if (!strip || strip.clientWidth === 0) return
    const current = Math.round(strip.scrollLeft / strip.clientWidth)
    if (current !== index) setIndex(current)
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') setIndex((value) => Math.max(0, value - 1))
      if (event.key === 'ArrowRight') setIndex((value) => Math.min(photos.length - 1, value + 1))
    }
    dialog.addEventListener('keydown', onKey)
    return () => dialog.removeEventListener('keydown', onKey)
  }, [photos.length, setIndex])

  const frame = '-mx-4 overflow-hidden bg-paper sm:mx-0 sm:rounded-card md:-mx-0'

  if (photos.length === 0) {
    return (
      <div className={`relative ${frame}`}>
        <div className="flex aspect-[4/3] items-center justify-center text-muted">
          <CategoryIcon name={fallbackIcon} className="size-16" />
        </div>
        {actions && <div className="absolute top-2 right-2 flex gap-1">{actions}</div>}
      </div>
    )
  }

  const arrowClass =
    'absolute top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/95 text-ink shadow-float hover:bg-surface disabled:hidden lg:flex'
  const fullArrowClass =
    'absolute top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25'

  return (
    <div className="space-y-2">
      <div className={`relative ${frame}`}>
        <div
          ref={stripRef}
          onScroll={handleScroll}
          className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto bg-ink [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((path, photoIndex) => (
            <button
              key={path}
              type="button"
              onClick={() => {
                setIndex(photoIndex)
                dialogRef.current?.showModal()
                if (IS_APP) setOpen(true)
              }}
              className="size-full shrink-0 snap-center focus-visible:outline-offset-[-4px]"
              aria-label={t('listing.openPhoto', { n: photoIndex + 1, total: photos.length })}
            >
              <img
                src={publicPhotoUrl(path)}
                alt={alt(photoIndex)}
                loading={photoIndex === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="size-full object-contain"
              />
            </button>
          ))}
        </div>

        {actions && <div className="absolute top-2 right-2 flex gap-1">{actions}</div>}

        <button
          type="button"
          className={`${arrowClass} left-3`}
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label={t('listing.previousPhoto')}
        >
          <ChevronLeft aria-hidden="true" className="size-6" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className={`${arrowClass} right-3`}
          onClick={() => goTo(index + 1)}
          disabled={index === photos.length - 1}
          aria-label={t('listing.nextPhoto')}
        >
          <ChevronRight aria-hidden="true" className="size-6" strokeWidth={1.75} />
        </button>

        {photos.length > 1 && (
          <div className="absolute inset-x-0 bottom-2 flex justify-center">
            {/* position dots: show where you are (photos change by swiping, arrows or thumbnails) */}
            <div aria-hidden="true" className="flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-1.5">
              {photos.map((path, photoIndex) => (
                <span
                  key={path}
                  className={`block rounded-full bg-white transition-all ${
                    photoIndex === index ? 'size-2' : 'size-1.5 opacity-60'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {photos.length > 1 && (
        <ul className="hidden gap-2 overflow-x-auto pb-1 lg:flex">
          {photos.map((path, photoIndex) => (
            <li key={path} className="shrink-0">
              <button
                type="button"
                onClick={() => goTo(photoIndex)}
                aria-label={t('listing.showPhoto', { n: photoIndex + 1 })}
                aria-current={photoIndex === index ? 'true' : undefined}
                className={`block size-16 overflow-hidden rounded-field border-2 ${
                  photoIndex === index ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={publicPhotoUrl(path)} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialogRef}
        aria-label={title}
        className="m-0 h-full max-h-none w-full max-w-none bg-black p-0 text-white backdrop:bg-black"
        onClose={() => {
          setOpen(false)
          if (IS_APP) {
            setZoom(1)
            setPan({ x: 0, y: 0 })
          }
          // show the same photo in the page gallery after closing
          const strip = stripRef.current
          if (strip) strip.scrollTo({ left: index * strip.clientWidth })
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close()
        }}
      >
        <div
          className="relative flex h-full items-center justify-center"
          style={IS_APP ? { touchAction: 'none' } : undefined}
          onTouchStart={
            IS_APP
              ? (event) => {
                  const a = event.touches[0],
                    b = event.touches[1]
                  gesture.current = {
                    x: a.clientX,
                    y: a.clientY,
                    distance: b ? Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) : 0,
                    zoom,
                    panX: pan.x,
                    panY: pan.y,
                    pinched: !!b,
                  }
                }
              : undefined
          }
          onTouchMove={
            IS_APP
              ? (event) => {
                  const a = event.touches[0],
                    b = event.touches[1],
                    start = gesture.current
                  if (b && start.distance) {
                    start.pinched = true
                    setZoom(
                      Math.max(
                        1,
                        Math.min(
                          5,
                          (start.zoom * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)) / start.distance
                        )
                      )
                    )
                  } else if (zoom > 1)
                    setPan({ x: start.panX + a.clientX - start.x, y: start.panY + a.clientY - start.y })
                }
              : undefined
          }
          onTouchEnd={
            IS_APP
              ? (event) => {
                  const start = gesture.current
                  if (event.touches.length || start.pinched || zoom > 1) return
                  const dx = event.changedTouches[0].clientX - start.x
                  const dy = event.changedTouches[0].clientY - start.y
                  if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy))
                    setIndex((value) => Math.max(0, Math.min(photos.length - 1, value + (dx < 0 ? 1 : -1))))
                }
              : undefined
          }
        >
          <img
            draggable={IS_APP ? false : undefined}
            style={IS_APP ? { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` } : undefined}
            src={publicPhotoUrl(photos[index])}
            alt={alt(index)}
            className="max-h-full max-w-full object-contain"
          />
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
            aria-label={t(IS_APP ? 'appShell.closeGallery' : 'listing.closePhoto')}
          >
            <X aria-hidden="true" className="size-6" strokeWidth={1.75} />
          </button>
          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex(index - 1)}
              className={`${fullArrowClass} left-3`}
              aria-label={t('listing.previousPhoto')}
            >
              <ChevronLeft aria-hidden="true" className="size-7" strokeWidth={1.75} />
            </button>
          )}
          {index < photos.length - 1 && (
            <button
              type="button"
              onClick={() => setIndex(index + 1)}
              className={`${fullArrowClass} right-3`}
              aria-label={t('listing.nextPhoto')}
            >
              <ChevronRight aria-hidden="true" className="size-7" strokeWidth={1.75} />
            </button>
          )}
          <span className="absolute bottom-4 rounded-full bg-black/60 px-3 py-1 text-sm tabular">
            {IS_APP
              ? t('appShell.galleryCounter', { current: index + 1, total: photos.length })
              : `${index + 1} / ${photos.length}`}
          </span>
        </div>
      </dialog>
    </div>
  )
}
