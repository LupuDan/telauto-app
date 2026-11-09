import { LayoutGrid, Search } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { usePageMeta } from '../app/usePageMeta'
import { CategoryIcon } from '../components/CategoryIcon'
import { ListingGrid, ListingGridSkeleton } from '../components/ListingCard'
import { buttonClass } from '../components/ui/buttonStyles'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { inputClass } from '../components/ui/fieldStyles'
import { Sheet } from '../components/ui/Sheet'
import { GarageHomeModule } from '../features/garage/GarageHomeModule'
import { useLocalities } from '../features/reference/hooks'
import { IS_APP } from '../native'
import { LoadMoreSentinel, SkeletonCardGrid } from '../appshell'
import { useBrowseListings, useSearchListings } from '../features/search/api'
import { CATEGORIES, CATEGORY_SLUGS, type CategoryConfig, type CategoryModule } from '../lib/categories'
import { formatNumber, localizedName } from '../lib/format'

const LATEST_ARGS = { p_limit: 12 }
/** phones show at most two rows of 4 tiles; with more categories the last tile opens the full list */
const MAX_TILES = 8
const SHOW_COUNT_FROM = 50

/** Home page panels that categories can declare (homeModule in src/lib/categories.ts). */
const MODULES: Record<CategoryModule, () => ReactNode> = {
  garage: () => <GarageHomeModule />,
}

export function HomePage() {
  const { t } = useTranslation()
  usePageMeta(t('home.metaTitle'), t('home.metaDescription'))
  const latest = useBrowseListings(LATEST_ARGS)
  const categories = CATEGORY_SLUGS.map((slug) => CATEGORIES[slug])
  const modules = [
    ...new Set(categories.map((category) => category.homeModule).filter((module) => module !== undefined)),
  ]

  return (
    <div className="space-y-10">
      <section className="max-w-3xl space-y-5 pt-2 lg:pt-6">
        <h1 className="type-display text-ink">{t('home.heading')}</h1>
        {!IS_APP && <HomeSearch />}
      </section>

      <section aria-label={t('home.categoriesHeading')}>
        <CategoryTiles categories={categories} />
      </section>

      {modules.map((module) => (
        <div key={module}>{MODULES[module]()}</div>
      ))}

      <section aria-labelledby="latest-heading" className="space-y-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="latest-heading" className="type-h2 text-ink">
            {t('home.latestHeading')}
          </h2>
          <Link to="/search" className="inline-flex min-h-11 items-center font-medium text-brand hover:underline">
            {t('home.seeAll')}
          </Link>
        </div>
        {latest.isPending ? (
          IS_APP ? (
            <SkeletonCardGrid />
          ) : (
            <ListingGridSkeleton />
          )
        ) : latest.isError && (!IS_APP || !latest.data) ? (
          <ErrorState error={latest.error} onRetry={() => void latest.refetch()} />
        ) : latest.data?.items.length === 0 ? (
          <EmptyState text={t('home.latestEmpty')} />
        ) : (
          <ListingGrid listings={latest.data?.items ?? []} />
        )}
        {IS_APP && latest.data && (
          <LoadMoreSentinel
            onReachEnd={() => void latest.fetchNextPage()}
            loading={latest.isFetchingNextPage}
            done={!latest.hasNextPage}
            enabled={!latest.isError}
          />
        )}
        {IS_APP && latest.isFetchingNextPage && <SkeletonCardGrid />}
        {IS_APP && latest.isError && latest.data && (
          <ErrorState error={latest.error} onRetry={() => void latest.fetchNextPage()} />
        )}
      </section>
    </div>
  )
}

/** Search box; on computers also the locality and the "Caută" button (plan de design, 6.1). */
function HomeSearch() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const localities = useLocalities()
  const [q, setQ] = useState('')
  const [locality, setLocality] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (locality) params.set('loc', locality)
    const query = params.toString()
    navigate(query ? `/search?${query}` : '/search')
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor="home-search" className="sr-only">
        {t('header.searchLabel')}
      </label>
      <div className="relative min-w-0 sm:flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted"
          strokeWidth={1.75}
        />
        <input
          id="home-search"
          type="search"
          enterKeyHint="search"
          value={q}
          maxLength={100}
          onChange={(event) => setQ(event.target.value)}
          placeholder={t('header.searchPlaceholder')}
          className={`${inputClass(false)} min-h-12 pl-11`}
        />
      </div>
      <div className="hidden sm:contents">
        <label htmlFor="home-locality" className="sr-only">
          {t('listingForm.locality')}
        </label>
        <select
          id="home-locality"
          value={locality}
          onChange={(event) => setLocality(event.target.value)}
          className={`${inputClass(false, 'w-52')} min-h-12`}
        >
          <option value="">{t('search.allLocalities')}</option>
          {localities.data?.map((item) => (
            <option key={item.id} value={String(item.id)}>
              {localizedName(item, i18n.resolvedLanguage)}
            </option>
          ))}
        </select>
        <button type="submit" className={`${buttonClass('primary')} min-h-12 px-6`}>
          {t('header.searchButton')}
        </button>
      </div>
    </form>
  )
}

const tileClass =
  'flex h-full min-h-24 flex-col items-center justify-start gap-2 rounded-card border border-line bg-surface px-1 py-3 text-center text-ink hover:border-brand sm:px-3'

function CategoryTiles({ categories }: { categories: CategoryConfig[] }) {
  const { t } = useTranslation()
  const [allOpen, setAllOpen] = useState(false)
  const tooMany = categories.length > MAX_TILES
  const shown = tooMany ? categories.slice(0, MAX_TILES - 1) : categories

  return (
    <>
      <ul className="grid grid-cols-4 gap-1.5 sm:gap-3 lg:grid-cols-8">
        {shown.map((category) => (
          <li key={category.slug}>
            <CategoryTile category={category} />
          </li>
        ))}
        {tooMany && (
          <li>
            <button type="button" onClick={() => setAllOpen(true)} className={`${tileClass} w-full`}>
              <LayoutGrid aria-hidden="true" className="size-7 text-brand" strokeWidth={1.75} />
              <span className="text-xs leading-4 font-medium break-words hyphens-auto sm:text-sm">
                {t('home.allCategories')}
              </span>
            </button>
          </li>
        )}
      </ul>
      {tooMany && (
        <Sheet open={allOpen} onClose={() => setAllOpen(false)} title={t('home.allCategories')}>
          <ul className="divide-y divide-line">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link to={`/c/${category.slug}`} className="flex min-h-12 items-center gap-3 text-ink hover:text-brand">
                  <span className="text-brand">
                    <CategoryIcon name={category.icon} />
                  </span>
                  {t(`categories.${category.slug}`)}
                </Link>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </>
  )
}

/** White tile, blue 28 px icon, name; on computers the number of listings when above 50. */
function CategoryTile({ category }: { category: CategoryConfig }) {
  const { t, i18n } = useTranslation()
  const [desktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const count = useSearchListings({ p_category_id: category.id, p_limit: 1 }, desktop)
  const total = count.data?.total ?? 0

  return (
    <Link to={`/c/${category.slug}`} className={tileClass}>
      <span className="text-brand">
        <CategoryIcon name={category.icon} className="size-7" />
      </span>
      {/* phones: short name so 4 tiles fit on one row ("Auto", "Piese auto") */}
      <span className="w-full text-xs leading-4 font-medium sm:text-sm sm:leading-5">
        <span className="sm:hidden">{t(`categoriesShort.${category.slug}`)}</span>
        <span className="hidden sm:inline">{t(`categories.${category.slug}`)}</span>
      </span>
      {desktop && total > SHOW_COUNT_FROM && (
        <span className="type-micro text-muted tabular">
          {t('search.resultCount', { count: total }).replace(String(total), formatNumber(total, i18n.resolvedLanguage))}
        </span>
      )}
    </Link>
  )
}
