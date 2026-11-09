import { useScreenHeader } from '../appshell'
import { IS_APP } from '../native'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { usePageMeta } from '../app/usePageMeta'
import { buttonClass } from '../components/ui/buttonStyles'
import { EmptyState } from '../components/ui/EmptyState'

/** "Pagina nu există sau anunțul a fost șters." + "Mergi la prima pagină" (plan de design, 6.9). */
export function NotFoundPage() {
  const { t } = useTranslation()
  useScreenHeader(IS_APP ? { title: t('notFound.heading') } : {})
  usePageMeta(t('notFound.metaTitle'))

  return (
    <section>
      <h1 className="sr-only">{t('notFound.heading')}</h1>
      <EmptyState
        text={t('notFound.text')}
        action={
          <Link to="/" className={buttonClass('secondary')}>
            {t('notFound.backHome')}
          </Link>
        }
      />
    </section>
  )
}
