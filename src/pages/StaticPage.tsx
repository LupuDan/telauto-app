import { IS_APP } from '../native'
import { useScreenHeader } from '../appshell'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { usePageMeta } from '../app/usePageMeta'
import { Alert } from '../components/ui/Alert'
import { translateKey, translateObject } from '../i18n/translate'
import { formatDate } from '../lib/format'
import { CONTACT_EMAIL, STATIC_PAGES, type StaticPageName } from '../lib/staticPages'
import { NotFoundPage } from './NotFoundPage'

// Texts live in src/i18n/*.json under "pages.<page>" (title, metaDescription, sections).
type Section = { heading: string; paragraphs: string[] }

/** Pages with legal texts that are provisional and must be checked by a lawyer before a public launch. */
const LEGAL_PAGES: readonly StaticPageName[] = ['terms', 'privacy']
const LAST_UPDATED = '2026-11-01'

export function StaticPage() {
  const { t, i18n } = useTranslation()
  const { page } = useParams()
  const name = STATIC_PAGES.find((item) => item === page)
  const title = name ? translateKey(t, `pages.${name}.title`) : ''
  useScreenHeader(IS_APP ? { title: title } : {})
  usePageMeta(
    name ? `${title} – Telauto.md` : t('notFound.metaTitle'),
    name ? translateKey(t, `pages.${name}.metaDescription`) : undefined
  )

  if (!name) return <NotFoundPage />
  const sections = translateObject<Section[]>(t, `pages.${name}.sections`)

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className={IS_APP ? 'sr-only' : 'type-h1 text-ink'}>{title}</h1>
        <p className="text-sm text-muted">
          {t('pages.common.updated', { date: formatDate(LAST_UPDATED, i18n.resolvedLanguage) })}
        </p>
        {LEGAL_PAGES.includes(name) && <Alert kind="warning">{t('pages.common.draftNotice')}</Alert>}
      </header>

      {name === 'contact' && (
        <p className="rounded-card border border-brand-100 bg-brand-50 p-4">
          <span className="block text-sm text-muted">{t('pages.common.contactEmail')}</span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-lg font-semibold break-all text-brand hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      )}

      {Array.isArray(sections) &&
        sections.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="type-h2 text-ink">{section.heading}</h2>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index} className="leading-relaxed text-ink">
                {paragraph}
              </p>
            ))}
          </section>
        ))}

      <nav aria-label={t('footer.navLabel')} className="border-t border-line pt-4">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {STATIC_PAGES.filter((item) => item !== name).map((item) => (
            <li key={item}>
              <Link to={`/p/${item}`} className="text-brand hover:underline">
                {translateKey(t, `pages.${item}.title`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  )
}
