import { useScreenHeader } from '../appshell'
import { haptic, IS_APP, useKeyboardHeight } from '../native'
import { Check, CheckCheck, ChevronLeft, SendHorizontal } from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { usePageMeta } from '../app/usePageMeta'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { buttonClass } from '../components/ui/buttonStyles'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { inputClass } from '../components/ui/fieldStyles'
import { LoadingState } from '../components/ui/LoadingState'
import { SafetyNotice } from '../components/ui/SafetyNotice'
import { useAuth } from '../features/auth/authContext'
import { errorToKey } from '../features/auth/authErrors'
import { publicPhotoUrl } from '../features/listings/photos'
import {
  MAX_MESSAGE_LENGTH,
  useConversation,
  useLiveConversation,
  useMessages,
  useSendMessage,
  type ConversationSummary,
  type Message,
} from '../features/messages/api'
import { ReportButton } from '../features/reports/ReportButton'
import { ConversationList } from '../features/messages/ConversationList'
import { translateKey } from '../i18n/translate'
import { formatDate, formatPrice } from '../lib/format'
import { useIsDesktop } from '../lib/useIsDesktop'
import { MessagesLayout } from './MessagesPage'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function ConversationPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const validId = id && UUID_PATTERN.test(id) ? id : undefined
  const conversation = useConversation(validId)
  const messages = useMessages(conversation.data ? validId : undefined)
  useLiveConversation(conversation.data ? validId : undefined)

  const keyboardHeight = useKeyboardHeight()
  const chatRef = useRef<HTMLDivElement>(null)
  const fullHeight = useRef(window.innerHeight)
  const [chatHeight, setChatHeight] = useState<number>()
  useLayoutEffect(() => {
    if (!IS_APP) return
    const update = () => {
      if (!keyboardHeight) fullHeight.current = window.innerHeight
      const available = Math.min(window.innerHeight, fullHeight.current - keyboardHeight)
      setChatHeight(Math.max(0, available - (chatRef.current?.getBoundingClientRect().top ?? 0)))
    }
    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [keyboardHeight, conversation.data])
  const { i18n } = useTranslation()
  const headerTitle = useMemo(() => {
    const c = conversation.data
    if (!c) return t('messages.title')
    const content = (
      <>
        <span className="size-11 shrink-0 overflow-hidden rounded-field bg-paper">
          {c.listingCover && <img src={publicPhotoUrl(c.listingCover)} alt="" className="size-full object-cover" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm text-ink">{c.listingTitle ?? t('messages.listingDeleted')}</span>
          <span className="block text-sm text-muted tabular">
            {c.listingPrice !== null && c.listingCurrency
              ? formatPrice(c.listingPrice, c.listingCurrency, i18n.resolvedLanguage)
              : ''}
          </span>
        </span>
      </>
    )
    return c.listingId ? (
      <Link to={'/a/' + c.listingId} className="flex min-w-0 items-center gap-2">
        {content}
      </Link>
    ) : (
      <span className="flex min-w-0 items-center gap-2">{content}</span>
    )
  }, [conversation.data, t, i18n.resolvedLanguage])
  useScreenHeader(IS_APP ? { title: headerTitle, header: 'inner' } : {})
  const name = conversation.data?.otherName || t('profile.unnamed')
  usePageMeta(conversation.data ? `${name} – ${t('messages.metaTitle')}` : t('messages.metaTitle'))

  // phones: the page behind the full-screen chat must not scroll
  const isDesktop = useIsDesktop() && !IS_APP
  useEffect(() => {
    if (isDesktop) return
    const html = document.documentElement
    const previous = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = previous
    }
  }, [isDesktop])

  let chat: ReactNode
  if (validId && conversation.isPending)
    chat = (
      <BackOnly>
        <LoadingState />
      </BackOnly>
    )
  else if (conversation.isError) {
    chat = (
      <BackOnly>
        <ErrorState error={conversation.error} onRetry={() => void conversation.refetch()} />
      </BackOnly>
    )
  } else if (!validId || !conversation.data) {
    chat = (
      <BackOnly>
        <EmptyState
          title={t('messages.notFound')}
          text={t('messages.empty')}
          action={
            <Link to="/messages" className={buttonClass('secondary')}>
              {t('messages.backToList')}
            </Link>
          }
        />
      </BackOnly>
    )
  } else {
    chat = (
      <>
        {!IS_APP && <ChatHeader conversation={conversation.data} />}
        {messages.isPending ? (
          <div className="flex-1">
            <LoadingState />
          </div>
        ) : messages.isError ? (
          <div className="flex-1">
            <ErrorState error={messages.error} onRetry={() => void messages.refetch()} />
          </div>
        ) : (
          <MessageList messages={messages.data} keyboardHeight={IS_APP ? keyboardHeight : 0} />
        )}
        <Composer conversation={conversation.data} />
      </>
    )
  }

  return (
    <MessagesLayout list={<ConversationList activeId={validId} />} showListOnPhone={false}>
      {/*
        phones: the chat covers the whole screen (also the site header), with "‹" back to the list;
        computers: the right column of the messages frame, the list stays on the left
      */}
      <div
        ref={chatRef}
        className={
          IS_APP
            ? 'flex min-h-0 flex-col overflow-hidden bg-surface'
            : 'fixed inset-0 z-40 flex flex-col bg-surface lg:static lg:z-auto lg:h-full'
        }
        style={IS_APP ? { height: chatHeight ?? 'calc(100dvh - var(--app-inset-top) - 4rem)' } : undefined}
      >
        {chat}
      </div>
    </MessagesLayout>
  )
}

/** Fixed row at the top: back (phones), the other person, and the listing (photo, title, price). */
function ChatHeader({ conversation: c }: { conversation: ConversationSummary }) {
  const { t, i18n } = useTranslation()
  const name = c.otherUserId ? c.otherName || t('profile.unnamed') : t('profile.deletedUser')

  const listing = (
    <>
      <span className="size-11 shrink-0 overflow-hidden rounded-field bg-paper">
        {c.listingCover && <img src={publicPhotoUrl(c.listingCover)} alt="" className="size-full object-cover" />}
      </span>
      <span className="min-w-0">
        {/* user text: plain text */}
        <span className="block truncate text-sm font-medium text-ink">
          {c.listingTitle ?? t('messages.listingDeleted')}
        </span>
        <span className="block text-sm text-muted tabular">
          {c.listingPrice !== null && c.listingCurrency
            ? formatPrice(c.listingPrice, c.listingCurrency, i18n.resolvedLanguage)
            : ''}
          {c.listingId && !c.listingAvailable ? ` · ${t('messages.listingUnavailable')}` : ''}
        </span>
      </span>
    </>
  )

  return (
    <div className="shrink-0 border-b border-line bg-surface px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 lg:px-4">
      <div className="flex items-center gap-1">
        <Link
          to="/messages"
          className="flex size-11 shrink-0 items-center justify-center rounded-field text-ink hover:bg-paper lg:hidden"
          aria-label={t('messages.backToList')}
        >
          <ChevronLeft aria-hidden="true" className="size-6" strokeWidth={1.75} />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          {c.otherUserId ? (
            <Link to={`/u/${c.otherUserId}`} className="truncate font-semibold text-ink hover:underline">
              {name}
            </Link>
          ) : (
            <span className="truncate font-semibold text-muted">{name}</span>
          )}
          <span className="shrink-0 text-sm text-muted">
            {c.iAmSeller ? t('messages.roleBuyer') : t('messages.roleSeller')}
          </span>
        </div>
      </div>
      {c.listingId && c.listingAvailable ? (
        <Link to={`/a/${c.listingId}`} className="mt-1 flex items-center gap-3 rounded-field p-1 hover:bg-paper">
          {listing}
        </Link>
      ) : (
        <div className="mt-1 flex items-center gap-3 p-1 opacity-70">{listing}</div>
      )}
    </div>
  )
}

function MessageList({ messages, keyboardHeight }: { messages: Message[]; keyboardHeight: number }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const bottomRef = useRef<HTMLDivElement>(null)
  const lng = i18n.resolvedLanguage
  const time = new Intl.DateTimeFormat(lng === 'ru' ? 'ru-MD' : 'ro-MD', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // always show the newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, keyboardHeight])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-muted">
        {t('messages.startHint')}
      </div>
    )
  }

  return (
    <div
      className="min-h-0 flex-1 space-y-1 overflow-y-auto bg-paper px-3 py-4 lg:px-5"
      role="log"
      aria-live="polite"
      aria-label={t('messages.title')}
    >
      <SafetyNotice compact className="mx-auto mb-3 max-w-prose">
        {t('messages.safetyNotice')}
      </SafetyNotice>
      {messages.map((message, index) => {
        const mine = message.senderId === user?.id
        const day = formatDate(message.createdAt, lng)
        const showDay = index === 0 || day !== formatDate(messages[index - 1].createdAt, lng)
        return (
          <div key={message.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
            {showDay && <p className="my-3 self-center text-sm text-muted">{day}</p>}
            {!mine && message.isFlagged && (
              <SafetyNotice compact className="mb-1 max-w-[85%]">
                {t('messages.flaggedWarning')}
              </SafetyNotice>
            )}
            {/* mine: blue, white text, on the right; theirs: white with an outline, on the left */}
            <div
              className={`max-w-[85%] rounded-panel px-3.5 py-2 ${
                mine ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md border border-line bg-surface text-ink'
              }`}
            >
              {/* user text: React shows it as plain text, never as HTML */}
              <p className="break-words whitespace-pre-wrap">{message.body}</p>
            </div>
            <p className="mt-0.5 mb-1.5 flex items-center gap-1 px-1 text-xs text-muted tabular">
              <time dateTime={message.createdAt}>{time.format(new Date(message.createdAt))}</time>
              {mine &&
                (message.readAt ? (
                  <CheckCheck aria-label={t('messages.read')} className="size-3.5 text-brand" strokeWidth={2} />
                ) : (
                  <Check aria-label={t('messages.sent')} className="size-3.5" strokeWidth={2} />
                ))}
              {!mine && message.senderId && (
                <span className="ml-2">
                  <ReportButton variant="link" target={{ messageId: message.id }} />
                </span>
              )}
            </p>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

function Composer({ conversation }: { conversation: ConversationSummary }) {
  const { t } = useTranslation()
  const send = useSendMessage(conversation.id)
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  if (!conversation.canReply) {
    return (
      <p className="shrink-0 border-t border-line bg-surface p-3 text-center text-sm text-muted">
        {conversation.otherUserId ? t('messages.cannotReplyBlocked') : t('messages.cannotReplyDeleted')}
      </p>
    )
  }

  function submit() {
    const body = text.trim()
    if (!body || send.isPending) return
    send.mutate(body, {
      onSuccess: () => {
        if (IS_APP) haptic('success')
        setText('')
        textareaRef.current?.focus()
      },
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit()
  }

  // Enter sends, Shift+Enter makes a new line (phones: the send button)
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 space-y-2 border-t border-line bg-surface px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:px-4"
    >
      {send.isError && <Alert kind="error">{translateKey(t, errorToKey(send.error))}</Alert>}
      <div className="flex items-end gap-2">
        <label htmlFor="message-text" className="sr-only">
          {t('messages.placeholder')}
        </label>
        <textarea
          id="message-text"
          ref={textareaRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={Math.min(5, Math.max(1, text.split('\n').length))}
          placeholder={t('messages.placeholder')}
          className={`${inputClass(false)} resize-none`}
        />
        <Button
          type="submit"
          loading={send.isPending}
          disabled={!text.trim()}
          aria-label={t('messages.send')}
          className="shrink-0 px-3 sm:px-4"
        >
          <SendHorizontal aria-hidden="true" className="size-5" strokeWidth={1.75} />
          <span className="hidden sm:inline">{t('messages.send')}</span>
        </Button>
      </div>
      {text.length > MAX_MESSAGE_LENGTH - 200 && (
        <p className="text-right text-sm text-muted tabular">
          {text.length} / {MAX_MESSAGE_LENGTH}
        </p>
      )}
    </form>
  )
}

/** While the chat loads (or cannot be opened): only the "‹" back to the list, then the content. */
function BackOnly({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <>
      <div
        className={
          IS_APP
            ? 'hidden'
            : 'shrink-0 border-b border-line px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 lg:hidden'
        }
      >
        <Link
          to="/messages"
          className="flex size-11 items-center justify-center rounded-field text-ink hover:bg-paper"
          aria-label={t('messages.backToList')}
        >
          <ChevronLeft aria-hidden="true" className="size-6" strokeWidth={1.75} />
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </>
  )
}
