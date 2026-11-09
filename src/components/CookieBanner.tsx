import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from './ui/Button'

const STORAGE_KEY = 'telauto.cookieNotice'

function wasClosed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Information banner: the site uses no advertising or tracking cookies, only the browser storage it needs
 * (login session, language, listing draft). Closed once, it does not come back.
 */
export function CookieBanner({ aboveBottomNav = false }: { aboveBottomNav?: boolean }) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(() => !wasClosed())

  if (!visible) return null

  function close() {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // private mode: the banner simply comes back next time
    }
    setVisible(false)
  }

  return (
    <div
      role="region"
      aria-label={t('cookies.more')}
      className={`fixed inset-x-0 z-40 border-t border-line bg-surface p-3 shadow-float sm:p-4 lg:bottom-0 ${
        aboveBottomNav ? 'bottom-[calc(4rem+var(--app-inset-bottom,env(safe-area-inset-bottom)))]' : 'bottom-0'
      }`}
    >
      <div className="mx-auto flex max-w-page flex-col gap-3 text-sm text-ink sm:flex-row sm:items-center">
        <p className="flex-1">
          {t('cookies.text')}{' '}
          <Link to="/p/privacy" className="font-semibold text-brand hover:underline">
            {t('cookies.more')}
          </Link>
        </p>
        <Button onClick={close} className="shrink-0">
          {t('cookies.accept')}
        </Button>
      </div>
    </div>
  )
}
