import { useScreenHeader } from '../../appshell'
import { IS_APP } from '../../native'
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import { useCallback, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'

/**
 * Row of the account lists (plan de design, 6.6): 56 px high, icon on the left, name,
 * number (if any) and a small arrow on the right. Rows are separated by 1 px lines, not cards.
 */
export function MenuRow({
  to,
  Icon,
  label,
  count,
  active = false,
  danger = false,
  arrow = true,
}: {
  to: string
  Icon: LucideIcon
  label: string
  count?: number
  active?: boolean
  danger?: boolean
  arrow?: boolean
}) {
  return (
    <li>
      <Link
        to={to}
        aria-current={active ? 'page' : undefined}
        className={`flex min-h-14 items-center gap-3 px-4 py-2 ${
          active
            ? 'bg-brand-50 font-semibold text-brand'
            : danger
              ? 'text-danger hover:bg-paper'
              : 'text-ink hover:bg-paper'
        }`}
      >
        <Icon
          aria-hidden="true"
          className={`size-5 shrink-0 ${active || danger ? '' : 'text-muted'}`}
          strokeWidth={1.75}
        />
        <span className="min-w-0 flex-1">{label}</span>
        {count !== undefined && count > 0 && <span className="tabular text-muted">{count}</span>}
        {arrow && <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" strokeWidth={2} />}
      </Link>
    </li>
  )
}

export function MenuList({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <nav aria-label={label}>
      <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">{children}</ul>
    </nav>
  )
}

/**
 * Title bar of an account screen: "‹" back to the previous account screen, then the title.
 * The back arrow is hidden on computers for the sections listed in the menu on the left (sidebar).
 */
export function ScreenHeader({
  title,
  back,
  backOnDesktop = false,
  children,
}: {
  title: string
  back: string
  backOnDesktop?: boolean
  children?: ReactNode
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const onBack = useCallback(() => {
    void navigate(back)
  }, [navigate, back])
  useScreenHeader(IS_APP ? { title, header: 'inner', onBack } : {})
  if (IS_APP) return children ? <div className="mb-4">{children}</div> : null
  return (
    <div className="mb-4 flex min-h-11 items-center gap-1">
      <Link
        to={back}
        aria-label={t('common.back')}
        className={`-ml-3 flex size-11 shrink-0 items-center justify-center rounded-field text-ink hover:bg-paper ${
          backOnDesktop ? '' : 'lg:hidden'
        }`}
      >
        <ChevronLeft aria-hidden="true" className="size-6" strokeWidth={2} />
      </Link>
      <h1 className="min-w-0 flex-1 type-h1 text-ink">{title}</h1>
      {children}
    </div>
  )
}
