import { IS_APP, useBackHandler } from '../../native'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Window that slides up from the bottom on phones (BottomSheet) and is a centred window on
 * computers (Modal) – plan de design, section 5. Built on <dialog>: the browser keeps the focus
 * inside, Esc closes it and the page behind cannot be used meanwhile.
 *
 * full: covers the whole phone screen (filters); on computers it is a tall centred window.
 * footer: stays fixed at the bottom (e.g. "Arată 1 240 de anunțuri").
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  full = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  full?: boolean
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  useBackHandler(() => {
    onClose()
    return true
  }, open)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        // Tab after the last control goes back to the first (and Shift+Tab the other way),
        // so the focus never leaves the window for the browser bar
        if (event.key !== 'Tab' || !ref.current) return
        const focusable = [
          ...ref.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ].filter((element) => element.offsetParent !== null)
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (!first || !last) return
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }}
      className={`m-0 mt-auto w-full max-w-none overflow-hidden bg-surface p-0 text-ink shadow-float backdrop:bg-black/50 open:flex open:flex-col open:animate-[sheet-up_200ms_ease-out] sm:m-auto sm:w-[min(32rem,calc(100%-2rem))] sm:rounded-panel sm:open:animate-none ${
        full
          ? `h-dvh max-h-none sm:h-[min(48rem,calc(100dvh-4rem))] ${IS_APP ? 'pt-[var(--app-inset-top,0px)]' : ''}`
          : 'max-h-[90dvh] rounded-t-panel'
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-2">
        <h2 className="type-h2">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="-mr-2 flex size-11 items-center justify-center rounded-field text-ink hover:bg-paper"
        >
          <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
      {footer && (
        <div className="shrink-0 border-t border-line bg-surface px-4 pt-3 pb-[max(0.75rem,var(--app-inset-bottom,env(safe-area-inset-bottom)))]">
          {footer}
        </div>
      )}
    </dialog>
  )
}
