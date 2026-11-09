import { IS_APP } from '../../native'
import { LoadMoreSentinel, SkeletonCardGrid, useScreenHeader } from '../../appshell'
import { ArrowUpDown, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ListingGrid, ListingGridSkeleton } from '../../components/ListingCard'
import { Pagination } from '../../components/Pagination'
import { Button } from '../../components/ui/Button'
import { buttonClass } from '../../components/ui/buttonStyles'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { inputClass } from '../../components/ui/fieldStyles'
import { Sheet } from '../../components/ui/Sheet'
import { translateKey } from '../../i18n/translate'
import { categoryBySlug, type CategoryConfig } from '../../lib/categories'
import { formatNumber } from '../../lib/format'
import { MyCarFilter } from '../garage/MyCarFilter'
import { ActiveFilters } from './ActiveFilters'
import { searchListings, useBrowseListings, useSearchListings, type ListingSummary } from './api'
import { FilterPanel } from './FilterPanel'
import {
  countActiveFilters,
  filtersToParams,
  filtersToSearchArgs,
  PAGE_SIZE,
  parseFilters,
  SORT_OPTIONS,
  type SearchArgs,
  type SearchFilters,
  type SortOption,
} from './filters'

/** Waits until the value stops changing (typing a price) before using it. */
function useDebounced<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/**
 * Results with filters, sorting and pages (plan de design, 6.2).
 * Used by #/c/:slug (one category) and #/search (all categories).
 * Computers: 280 px filter column that stays in view + 3 columns of cards.
 * Phones: "Filtre (2)" and "Sortare" buttons; the filters open in a full-screen panel from the
 * bottom with the fixed button "Arată 1 240 de anunțuri".
 */
export function SearchResults({ category, heading }: { category?: CategoryConfig; heading: string }) {
  const { t, i18n } = useTranslation()
  const lng = i18n.resolvedLanguage
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [panelOpen, setPanelOpen] = useState(false)

  const filters = useMemo(() => parseFilters(params, category), [params, category])
  const args = useMemo(() => filtersToSearchArgs(filters, category), [filters, category])
  const result = useBrowseListings(args)
  useScreenHeader(IS_APP ? { title: heading } : {})

  const basePath = category ? `/c/${category.slug}` : '/search'
  const hrefFor = (next: SearchFilters, path = basePath) => {
    const query = filtersToParams(next).toString()
    return query ? `${path}?${query}` : path
  }

  function applyFilters(next: SearchFilters, categorySlug?: string) {
    setPanelOpen(false)
    navigate(hrefFor(next, categorySlug ? `/c/${categorySlug}` : basePath))
  }

  function changeSort(sort: SortOption) {
    navigate(hrefFor({ ...filters, sort, page: 1 }))
  }

  // number of results of the filters being edited in the phone panel ("Arată 1 240 de anunțuri")
  const [draftArgs, setDraftArgs] = useState<SearchArgs>(args)
  const onDraftChange = useCallback(
    (draft: SearchFilters, categorySlug: string) => {
      const draftCategory = categoryBySlug(categorySlug) ?? category
      setDraftArgs({ ...filtersToSearchArgs({ ...draft, page: 1 }, draftCategory), p_limit: 1, p_offset: 0 })
    },
    [category]
  )
  const debouncedDraftArgs = useDebounced(draftArgs)
  const draftCount = useSearchListings(debouncedDraftArgs, panelOpen)

  // phones: "Încarcă mai multe" adds the next pages under the ones already shown
  const [more, setMore] = useState<{ key: string; items: ListingSummary[]; loading: boolean; error: boolean }>({
    key: '',
    items: [],
    loading: false,
    error: false,
  })
  const argsKey = JSON.stringify(args)
  const extra = more.key === argsKey ? more.items : []
  async function loadMore() {
    setMore({ key: argsKey, items: extra, loading: true, error: false })
    try {
      const next = await searchListings({ ...args, p_offset: (args.p_offset ?? 0) + PAGE_SIZE + extra.length })
      setMore({ key: argsKey, items: [...extra, ...next.items], loading: false, error: false })
    } catch {
      setMore({ key: argsKey, items: extra, loading: false, error: true })
    }
  }

  // new page or new filters: start at the top of the list
  useEffect(() => {
    if (!IS_APP) window.scrollTo({ top: 0 })
  }, [params])

  const total = result.data?.total ?? 0
  const pageCount = Math.min(Math.ceil(total / PAGE_SIZE), 400)
  const activeCount = countActiveFilters(filters)
  const countText = (count: number) =>
    t('search.resultCount', { count }).replace(String(count), formatNumber(count, lng))
  const panelKey = `${category?.slug ?? 'all'}?${params.toString()}`

  const sortSelect = (id: string, className: string) => (
    <select
      id={id}
      value={filters.sort}
      onChange={(event) => changeSort(event.target.value as SortOption)}
      className={className}
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {translateKey(t, `search.sort.${option}`)}
        </option>
      ))}
    </select>
  )

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className={IS_APP ? 'sr-only' : 'type-h1 break-words text-ink'}>{heading}</h1>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-muted tabular" aria-live="polite">
            {result.data ? countText(total) : ' '}
          </p>
          <div className={IS_APP ? 'hidden' : 'hidden items-center gap-2 lg:flex'}>
            <label htmlFor="sort-desktop" className="text-sm text-muted">
              {t('search.sortButton')}:
            </label>
            {sortSelect('sort-desktop', inputClass(false, 'w-auto'))}
          </div>
        </div>
      </div>

      {/* phones and tablets: two equal buttons */}
      <div
        className={
          IS_APP
            ? 'sticky top-[calc(4rem+var(--app-inset-top))] z-20 grid grid-cols-2 gap-2 bg-paper py-2'
            : 'grid grid-cols-2 gap-2 lg:hidden'
        }
      >
        <Button variant="secondary" onClick={() => setPanelOpen(true)}>
          <SlidersHorizontal aria-hidden="true" className="size-5" strokeWidth={1.75} />
          {activeCount > 0 ? `${t('search.filtersButton')} (${activeCount})` : t('search.filtersButton')}
        </Button>
        <div className={`${buttonClass('secondary')} relative`}>
          <ArrowUpDown aria-hidden="true" className="size-5" strokeWidth={1.75} />
          <span aria-hidden="true">{t('search.sortButton')}</span>
          {/* the real list covers the button, so tapping opens the phone's own picker */}
          <label htmlFor="sort-mobile" className="sr-only">
            {t('search.sortButton')}
          </label>
          {sortSelect('sort-mobile', 'absolute -inset-px cursor-pointer opacity-0')}
        </div>
      </div>

      <ActiveFilters filters={filters} category={category} hrefFor={(next) => hrefFor(next)} clearHref={basePath} />

      <div className={IS_APP ? '' : 'lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-6'}>
        {/* computers: the column stays in view below the header and scrolls inside if taller than the screen */}
        <aside
          aria-label={t('search.filtersTitle')}
          className={
            IS_APP
              ? 'hidden'
              : 'hidden lg:sticky lg:top-[5.25rem] lg:flex lg:max-h-[calc(100dvh-6.5rem)] lg:flex-col lg:overflow-hidden lg:rounded-panel lg:border lg:border-line lg:bg-surface'
          }
        >
          <h2 className="border-b border-line px-4 py-3 type-h2">{t('search.filtersTitle')}</h2>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <FilterPanel
              key={panelKey}
              formId="filters-desktop"
              category={category}
              filters={filters}
              onApply={applyFilters}
              showButtons
            />
          </div>
        </aside>

        <section className="min-w-0 space-y-4" aria-label={t('search.results')}>
          {category?.hasCompatibility && (
            <MyCarFilter
              filters={filters}
              onChange={(vehicle) =>
                navigate(
                  hrefFor({
                    ...filters,
                    page: 1,
                    compatMake: vehicle ? String(vehicle.makeId) : '',
                    compatModel: vehicle?.modelId ? String(vehicle.modelId) : '',
                    compatYear: vehicle ? String(vehicle.year) : '',
                  })
                )
              }
            />
          )}

          {result.isPending ? (
            IS_APP ? (
              <SkeletonCardGrid count={9} />
            ) : (
              <ListingGridSkeleton columns={3} count={9} />
            )
          ) : result.isError && (!IS_APP || !result.data) ? (
            <ErrorState error={result.error} onRetry={() => void result.refetch()} />
          ) : result.data?.items.length === 0 ? (
            <EmptyState
              text={t('search.emptyText')}
              action={
                (activeCount > 0 || filters.q) && (
                  <Link to={basePath} className={buttonClass('secondary')}>
                    {t('search.clearAll')}
                  </Link>
                )
              }
            />
          ) : (
            <div className={result.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
              <ListingGrid listings={[...(result.data?.items ?? []), ...(IS_APP ? [] : extra)]} columns={3} />
            </div>
          )}

          {!IS_APP && result.data && (filters.page - 1) * PAGE_SIZE + PAGE_SIZE + extra.length < total && (
            <div className="flex flex-col items-center gap-2 lg:hidden">
              <Button
                variant="secondary"
                fullWidth
                loading={more.loading && more.key === argsKey}
                onClick={() => void loadMore()}
              >
                {t('search.loadMore')}
              </Button>
              {more.error && more.key === argsKey && <p className="text-sm text-danger">{t('errors.network')}</p>}
            </div>
          )}
          {IS_APP && result.data && (
            <LoadMoreSentinel
              onReachEnd={() => void result.fetchNextPage()}
              loading={result.isFetchingNextPage}
              done={!result.hasNextPage}
              enabled={!result.isError}
            />
          )}
          {IS_APP && result.isFetchingNextPage && <SkeletonCardGrid />}
          {IS_APP && result.isError && result.data && (
            <ErrorState error={result.error} onRetry={() => void result.fetchNextPage()} />
          )}
          <div className={IS_APP ? 'hidden' : 'hidden lg:block'}>
            <Pagination page={filters.page} pageCount={pageCount} hrefFor={(page) => hrefFor({ ...filters, page })} />
          </div>
        </section>
      </div>

      <Sheet
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={t('search.filtersTitle')}
        full
        footer={
          <Button type="submit" form="filters-mobile" fullWidth loading={draftCount.isFetching && !draftCount.data}>
            {draftCount.data
              ? t('search.show', { count: draftCount.data.total }).replace(
                  String(draftCount.data.total),
                  formatNumber(draftCount.data.total, lng)
                )
              : t('search.apply')}
          </Button>
        }
      >
        {panelOpen && (
          <FilterPanel
            key={panelKey}
            formId="filters-mobile"
            category={category}
            filters={filters}
            onApply={applyFilters}
            onDraftChange={onDraftChange}
          />
        )}
      </Sheet>
    </div>
  )
}
