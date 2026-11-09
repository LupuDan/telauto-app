import { IS_APP } from '../../native'
import { usePullToRefresh } from '../../lib/usePullToRefresh'
import { SkeletonRows } from '../../appshell'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { buttonClass } from '../../components/ui/buttonStyles'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { formatListingDate, formatPrice } from '../../lib/format'
import { publicPhotoUrl } from '../listings/photos'
import { useConversations, type ConversationSummary } from './api'

/**
 * List of conversations (plan de design, 6.5): photo of the listing, the other person's name,
 * price, last message on one line and the time. Unread: bold name and a blue dot.
 * activeId: the conversation open next to the list (computers).
 */
export function ConversationList({ activeId }: { activeId?: string }) {
  const conversations = useConversations()
  if (IS_APP && !activeId) return <RefreshableConversations conversations={conversations} />
  return <ConversationItems conversations={conversations} activeId={activeId} />
}
function RefreshableConversations({ conversations }: { conversations: ReturnType<typeof useConversations> }) {
  const { t } = useTranslation()
  const { pull, refreshing } = usePullToRefresh(() => conversations.refetch())
  return (
    <>
      {(pull > 0 || refreshing) && (
        <div
          role="status"
          className="flex justify-center py-2 text-sm text-muted"
          style={{ minHeight: refreshing ? 40 : pull / 2 }}
        >
          {t('myListings.refreshing')}
        </div>
      )}
      <ConversationItems conversations={conversations} />
    </>
  )
}
function ConversationItems({
  conversations,
  activeId,
}: {
  conversations: ReturnType<typeof useConversations>
  activeId?: string
}) {
  const { t } = useTranslation()

  if (conversations.isPending) return IS_APP ? <SkeletonRows /> : <ConversationListSkeleton />
  if (conversations.isError) {
    return <ErrorState error={conversations.error} onRetry={() => void conversations.refetch()} />
  }
  if (conversations.data.length === 0) {
    return (
      <EmptyState
        text={t('messages.empty')}
        action={
          <Link to="/search" className={buttonClass('secondary')}>
            {t('favorites.browse')}
          </Link>
        }
      />
    )
  }

  return (
    <ul className="divide-y divide-line">
      {conversations.data.map((conversation) => (
        <li key={conversation.id}>
          <ConversationRow conversation={conversation} active={conversation.id === activeId} />
        </li>
      ))}
    </ul>
  )
}

function ConversationRow({ conversation: c, active }: { conversation: ConversationSummary; active: boolean }) {
  const { t, i18n } = useTranslation()
  const lng = i18n.resolvedLanguage
  const unread = c.unreadCount > 0
  const name = c.otherUserId ? c.otherName || t('profile.unnamed') : t('profile.deletedUser')

  return (
    <Link
      to={`/messages/${c.id}`}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 px-3 py-3 focus-visible:-outline-offset-2 ${
        active ? 'bg-brand-50' : 'hover:bg-paper'
      }`}
    >
      <span className="size-14 shrink-0 overflow-hidden rounded-field bg-paper">
        {c.listingCover && (
          <img src={publicPhotoUrl(c.listingCover)} alt="" loading="lazy" className="size-full object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={`truncate text-ink ${unread ? 'font-semibold' : 'font-medium'}`}>{name}</span>
          <span className={`shrink-0 text-sm tabular ${unread ? 'font-medium text-brand' : 'text-muted'}`}>
            {formatListingDate(c.lastMessageAt, lng)}
          </span>
        </span>
        <span className="block truncate text-sm text-muted tabular">
          {c.listingPrice !== null && c.listingCurrency ? formatPrice(c.listingPrice, c.listingCurrency, lng) : ''}
          {/* user text: plain text */}
          {c.listingTitle ? ` · ${c.listingTitle}` : ` · ${t('messages.listingDeleted')}`}
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className={`truncate text-sm ${unread ? 'font-medium text-ink' : 'text-muted'}`}>
            {c.lastBody ? `${c.lastFromMe ? `${t('messages.you')}: ` : ''}${c.lastBody}` : t('messages.noMessagesYet')}
          </span>
          {unread && (
            <span className="size-2.5 shrink-0 rounded-full bg-brand">
              <span className="sr-only">{t('messages.unread', { count: c.unreadCount })}</span>
            </span>
          )}
        </span>
      </span>
    </Link>
  )
}

function ConversationListSkeleton() {
  return (
    <ul aria-hidden="true" className="divide-y divide-line">
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index} className="flex items-center gap-3 px-3 py-3">
          <span className="size-14 shrink-0 animate-pulse rounded-field bg-slate-100" />
          <span className="flex-1 space-y-2">
            <span className="block h-4 w-1/2 animate-pulse rounded-full bg-slate-100" />
            <span className="block h-3 w-3/4 animate-pulse rounded-full bg-slate-100" />
          </span>
        </li>
      ))}
    </ul>
  )
}
