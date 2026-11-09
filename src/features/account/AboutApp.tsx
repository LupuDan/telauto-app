import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useAppVersion } from '../../native'
import { STATIC_PAGES } from '../../lib/staticPages'
import { setThemePreference, subscribeTheme, themePreference, type ThemePreference } from '../../lib/theme'
import { SelectField } from '../../components/ui/SelectField'
export function AboutApp({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const version = useAppVersion()
  const theme = useSyncExternalStore(subscribeTheme, themePreference)
  return (
    <section className="space-y-3">
      <h2 className="type-h2 text-ink">{t('appShell.aboutApp')}</h2>
      <nav
        aria-label={t('appShell.aboutApp')}
        className="divide-y divide-line rounded-card border border-line bg-surface"
      >
        {STATIC_PAGES.map((page) => (
          <Link key={page} to={'/p/' + page} className="flex min-h-14 items-center px-4 text-ink hover:bg-paper">
            {t(`footer.${page}`)}
          </Link>
        ))}
      </nav>
      <SelectField
        label={t('appShell.themeLabel')}
        value={theme}
        onChange={(event) => setThemePreference(event.target.value as ThemePreference)}
      >
        {(['system', 'light', 'dark'] as const).map((value) => (
          <option key={value} value={value}>
            {t(
              value === 'system'
                ? 'appShell.themeSystem'
                : value === 'light'
                  ? 'appShell.themeLight'
                  : 'appShell.themeDark',
            )}
          </option>
        ))}
      </SelectField>
      {children}
      {version && <p className="text-sm text-muted">{t('appShell.version', { version })}</p>}
    </section>
  )
}
