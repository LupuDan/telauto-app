import { useTranslation } from 'react-i18next'
import { Logo } from '../components/Logo'
import { Button } from '../components/ui/Button'
import { useOnline } from '../native'

export function OfflineBanner() {
  const online = useOnline()
  const { t } = useTranslation()
  return online ? null : (
    <div role="status" className="border-b border-line bg-paper px-4 py-2 text-center text-sm text-muted">
      {t('appShell.offlineBanner')}
    </div>
  )
}
export function OfflineScreen({ onRetry = () => window.location.reload() }: { onRetry?: () => void }) {
  const { t } = useTranslation()
  return (
    <section className="flex min-h-80 flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo variant="icon" className="size-12" />
      <h1 className="font-display text-xl">{t('appShell.offlineTitle')}</h1>
      <p className="text-muted">{t('appShell.offlineText')}</p>
      <Button onClick={onRetry}>{t('appShell.retry')}</Button>
    </section>
  )
}
