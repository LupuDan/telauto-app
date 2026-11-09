import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import { Logo } from '../components/Logo'
import { SearchBar } from '../components/SearchBar'
import { Button } from '../components/ui/Button'
import { parentRoute, type ScreenRoute } from './routes'
import type { ScreenHeaderOptions } from './ScreenHeader'

export function AppHeader({ route, options = {} }: { route: ScreenRoute; options?: ScreenHeaderOptions }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [scroll, setScroll] = useState(() => window.scrollY)
  useEffect(() => {
    const update = () => setScroll(window.scrollY)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [pathname])
  const kind = options.header ?? route.header
  if (kind === 'none') return null
  const overlay = kind === 'overlay' && scroll < (options.overlayUntil ?? 320)
  const title = options.title ?? (route.titleKey ? t(route.titleKey) : '')
  const back = () => {
    if (options.onBack) options.onBack()
    else if (window.history.state?.idx > 0) void navigate(-1)
    else void navigate(parentRoute(pathname), { replace: true })
  }
  return (
    <header
      className={`app-shell-header ${overlay ? 'app-shell-header-overlay' : 'bg-surface'} ${scroll > 0 && !overlay ? 'border-b border-line' : ''}`}
    >
      <div className="app-shell-width px-4 py-2">
        {kind === 'home' ? (
          <div className="flex flex-col gap-3">
            <Link to="/" aria-label={t('nav.home')}>
              <Logo variant="compact" />
            </Link>
            <SearchBar />
          </div>
        ) : (
          <div className="flex min-h-12 items-center gap-2">
            {(kind === 'inner' || kind === 'overlay') && (
              <Button
                variant="ghost"
                onClick={back}
                aria-label={t('appShell.back')}
                className={`app-shell-icon ${overlay ? 'rounded-full bg-surface shadow-float' : ''}`}
              >
                <ArrowLeft aria-hidden="true" className="size-6" />
              </Button>
            )}
            <h1
              className={`min-w-0 flex-1 truncate ${kind === 'large' && scroll <= 0 ? 'font-display text-2xl font-semibold' : 'text-lg font-semibold'} ${overlay ? 'invisible' : ''}`}
            >
              {title}
            </h1>
            {options.actions?.slice(0, 2).map((action, index) => (
              <div key={index} className={`app-shell-icon ${overlay ? 'rounded-full bg-surface shadow-float' : ''}`}>
                {action}
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
