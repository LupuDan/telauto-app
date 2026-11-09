import { CircleCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { subscribeToasts, type ToastMessage } from '../../lib/toast'

/**
 * Notices at the bottom on phones (above the bottom bar), top right on computers; gone after 4 s.
 * A notice with an action ("Anulează") stays 5 s and disappears as soon as the action is pressed.
 */
export function Toaster() {
  const [messages, setMessages] = useState<ToastMessage[]>([])
  const dismiss = (id: number) => setMessages((current) => current.filter((item) => item.id !== id))

  useEffect(
    () =>
      subscribeToasts((message) => {
        setMessages((current) => [...current.slice(-2), message])
        window.setTimeout(() => dismiss(message.id), message.duration)
      }),
    [],
  )

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(5rem+var(--app-inset-bottom,env(safe-area-inset-bottom)))] z-50 flex flex-col items-center gap-2 lg:inset-x-auto lg:top-20 lg:right-6 lg:bottom-auto lg:items-end"
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className="pointer-events-auto flex max-w-sm animate-[toast-in_200ms_ease-out] items-center gap-2 rounded-field bg-ink py-1 pr-1 pl-4 text-sm text-surface shadow-float"
        >
          <CircleCheck aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
          <p className={`flex-1 ${message.action ? '' : 'py-2 pr-3'}`}>{message.text}</p>
          {message.action && (
            <button
              type="button"
              onClick={() => {
                message.action?.onClick()
                dismiss(message.id)
              }}
              className="min-h-11 shrink-0 rounded-field px-3 font-semibold text-surface underline underline-offset-2 hover:bg-surface/10"
            >
              {message.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
