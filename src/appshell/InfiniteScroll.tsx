import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
export type InfiniteScrollOptions = { enabled?: boolean; loading?: boolean; done?: boolean }
/** Attach the returned ref to a sentinel. A new load requires a loading cycle or leaving the viewport. */
// eslint-disable-next-line react-refresh/only-export-components -- Hook and its sentinel share one public pagination module.
export function useInfiniteScroll(
  onReachEnd: () => void,
  { enabled = true, loading = false, done = false }: InfiniteScrollOptions = {},
) {
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const callback = useRef(onReachEnd)
  const fired = useRef(false)
  useEffect(() => {
    callback.current = onReachEnd
  }, [onReachEnd])
  useEffect(() => {
    if (loading) fired.current = false
    if (!element || !enabled || loading || done || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          fired.current = false
          return
        }
        if (!fired.current) {
          fired.current = true
          callback.current()
        }
      },
      { rootMargin: '240px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [element, enabled, loading, done])
  return setElement
}
export function LoadMoreSentinel({
  onReachEnd,
  enabled = true,
  loading = false,
  done = false,
}: InfiniteScrollOptions & { onReachEnd: () => void }) {
  const { t } = useTranslation()
  const ref = useInfiniteScroll(onReachEnd, { enabled, loading, done })
  return (
    <div
      ref={ref}
      className="flex min-h-12 items-center justify-center gap-2 py-4 text-sm text-muted"
      role="status"
      aria-live="polite"
    >
      {loading ? (
        <>
          <Spinner className="size-5" />
          {t('appShell.loadingMore')}
        </>
      ) : done ? (
        t('appShell.endOfList')
      ) : enabled && typeof IntersectionObserver === 'undefined' ? (
        <Button variant="ghost" onClick={onReachEnd}>
          {t('appShell.loadingMore')}
        </Button>
      ) : null}
    </div>
  )
}
