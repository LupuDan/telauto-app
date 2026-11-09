import { useScreenHeader } from '../appshell'
import { IS_APP } from '../native'
import { MessageCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { usePageMeta } from '../app/usePageMeta'
import { ConversationList } from '../features/messages/ConversationList'

/**
 * Messages (plan de design, 6.5). Phones: two screens (this list, then the conversation).
 * Computers: two columns, the list on the left (360 px) and the conversation on the right.
 */
export function MessagesPage() {
  const { t } = useTranslation()
  useScreenHeader(IS_APP ? { title: t('messages.title') } : {})
  usePageMeta(t('messages.metaTitle'))

  return (
    <MessagesLayout list={<ConversationList />}>
      <div className="hidden h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted lg:flex">
        <MessageCircle aria-hidden="true" className="size-10" strokeWidth={1.5} />
        <p>{t('messages.chooseConversation')}</p>
      </div>
    </MessagesLayout>
  )
}

/**
 * Frame shared by the list page and the conversation page. `showListOnPhone`: the list page
 * shows the list on phones; the conversation page shows only the chat there.
 */
export function MessagesLayout({
  list,
  children,
  showListOnPhone = true,
}: {
  list: ReactNode
  children: ReactNode
  showListOnPhone?: boolean
}) {
  const { t } = useTranslation()
  if (IS_APP) return <div className="min-h-0">{showListOnPhone ? list : children}</div>
  return (
    <div
      className={
        IS_APP
          ? ''
          : 'lg:grid lg:h-[calc(100dvh-10rem)] lg:min-h-[32rem] lg:grid-cols-[360px_minmax(0,1fr)] lg:overflow-hidden lg:rounded-panel lg:border lg:border-line lg:bg-surface'
      }
    >
      <section
        aria-label={t('messages.title')}
        className={
          IS_APP
            ? showListOnPhone
              ? ''
              : 'hidden'
            : `${showListOnPhone ? '' : 'hidden'} lg:flex lg:min-h-0 lg:flex-col lg:border-r lg:border-line`
        }
      >
        <h1
          className={
            IS_APP ? 'sr-only' : 'mb-4 type-h1 text-ink lg:mb-0 lg:border-b lg:border-line lg:px-4 lg:py-3 lg:type-h2'
          }
        >
          {t('messages.title')}
        </h1>
        <div className="-mx-4 border-y border-line bg-surface md:mx-0 md:rounded-card md:border lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:rounded-none lg:border-0">
          {list}
        </div>
      </section>
      <div className={`${showListOnPhone ? 'hidden' : ''} min-h-0 lg:block`}>{children}</div>
    </div>
  )
}
