import { appBottomPanelClass, useScreenHeader } from '../../appshell'
import { haptic, IS_APP, useBackHandler } from '../../native'
import { Sheet } from '../../components/ui/Sheet'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { CategoryIcon } from '../../components/CategoryIcon'
import { ListingCard } from '../../components/ListingCard'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { CheckboxField } from '../../components/ui/CheckboxField'
import { ChipGroup } from '../../components/ui/ChipGroup'
import { FieldError, FieldLabel } from '../../components/ui/FieldMessage'
import { inputClass } from '../../components/ui/fieldStyles'
import { SelectField } from '../../components/ui/SelectField'
import { TextField } from '../../components/ui/TextField'
import { useFieldError } from '../../components/ui/useFieldError'
import { translateKey } from '../../i18n/translate'
import { buildAttributes, CATEGORIES, CATEGORY_SLUGS, categoryBySlug, type CategoryConfig } from '../../lib/categories'
import { currencyUnit, localizedName, normalizePhone, PHONE_PATTERN } from '../../lib/format'
import { isValidImei, isValidVin, parsePrice } from '../../lib/validators'
import { useAuth } from '../auth/authContext'
import { errorToKey } from '../auth/authErrors'
import { updateMyPhone } from '../profile/api'
import { profileKeys, useMyPhone, useProfile } from '../profile/hooks'
import { useLocalities } from '../reference/hooks'
import { createListing, DraftSavedError, updateListing, type ListingStatus, type SaveProgress } from './api'
import { AttributeFields } from './AttributeFields'
import { CompatibilityEditor } from './CompatibilityEditor'
import { clearLocalDraft, saveLocalDraft } from './draft'
import { listingKeys } from './hooks'
import { PhotoUploader } from './PhotoUploader'
import type { PhotoItem } from './photos'
import {
  EMPTY_COMPATIBILITY,
  EMPTY_LISTING,
  listingSchema,
  STEP_FIELDS,
  WIZARD_STEPS,
  type ListingFormValues,
  type WizardStep,
} from './schema'

type Props =
  | { mode: 'new'; initialValues: ListingFormValues; initialPhotos?: PhotoItem[] }
  | {
      mode: 'edit'
      listingId: string
      status: ListingStatus
      initialValues: ListingFormValues
      initialPhotos: PhotoItem[]
    }

/** Steps: category -> photos -> details -> characteristics -> contact & publish (plan, section 7). */
export function ListingWizard(props: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const profile = useProfile(user?.id)

  const methods = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: props.initialValues,
    mode: 'onTouched',
  })
  const { control, trigger, handleSubmit, getValues } = methods
  const categorySlug = useWatch({ control, name: 'categorySlug' })
  const category = categoryBySlug(categorySlug)

  const steps = useMemo(
    () => (props.mode === 'edit' ? WIZARD_STEPS.filter((s) => s !== 'category') : WIZARD_STEPS),
    [props.mode],
  )
  const [step, setStep] = useState<WizardStep>(steps[0])
  const [photos, setPhotos] = useState<PhotoItem[]>(props.initialPhotos ?? [])
  const [photoError, setPhotoError] = useState<string>()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [progress, setProgress] = useState<SaveProgress | null>(null)

  const [leaveOpen, setLeaveOpen] = useState(false)
  const stepIndex = steps.indexOf(step)
  const back = useCallback(() => {
    if (progress) return
    if (stepIndex > 0) {
      setStep(steps[stepIndex - 1])
      window.scrollTo({ top: 0 })
      return
    }
    const filled =
      methods.formState.isDirty || photos.length > 0 || JSON.stringify(getValues()) !== JSON.stringify(EMPTY_LISTING)
    if (filled) setLeaveOpen(true)
    else if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/account', { replace: true })
  }, [progress, stepIndex, steps, methods.formState.isDirty, photos.length, getValues, navigate])
  useBackHandler(() => {
    if (leaveOpen) setLeaveOpen(false)
    else back()
    return true
  })
  useScreenHeader(
    IS_APP ? { title: t(props.mode === 'new' ? 'listingForm.newTitle' : 'listingForm.editTitle'), onBack: back } : {},
  )
  const isDraftEdit = props.mode === 'edit' && props.status === 'draft'
  const willPublish = props.mode === 'new' || isDraftEdit

  // Local draft: keep what was typed (new listings only; photos cannot be stored).
  const allValues = useWatch({ control })
  useEffect(() => {
    if (props.mode !== 'new') return
    const timer = window.setTimeout(() => saveLocalDraft(allValues as ListingFormValues), 400)
    return () => window.clearTimeout(timer)
  }, [allValues, props.mode])

  function goTo(next: WizardStep) {
    setStep(next)
    window.scrollTo({ top: 0 })
  }

  function photosOk(): boolean {
    if (!category) return false
    if (photos.length < category.minPhotos) {
      setPhotoError(t('listingForm.photosMin', { count: category.minPhotos }))
      return false
    }
    setPhotoError(undefined)
    return true
  }

  async function next() {
    if (step === 'photos' && !photosOk()) return
    const fields = STEP_FIELDS[step]
    if (fields.length > 0 && !(await trigger([...fields], { shouldFocus: true }))) return
    goTo(steps[stepIndex + 1])
  }

  function chooseCategory(slug: string) {
    if (getValues('categorySlug') !== slug) {
      const hasCompatibility = categoryBySlug(slug)?.hasCompatibility ?? false
      methods.reset({
        ...getValues(),
        categorySlug: slug,
        attributes: {},
        imei: '',
        vin: '',
        // auto parts need at least one compatibility row: show an empty one right away
        compatibility: hasCompatibility ? [{ ...EMPTY_COMPATIBILITY }] : [],
      })
    }
    goTo('photos')
  }

  async function onSubmit(values: ListingFormValues) {
    if (!user || !category) return
    if (!photosOk()) {
      goTo('photos')
      return
    }
    setSubmitError(null)
    try {
      let savedId: string
      if (props.mode === 'new') {
        savedId = await createListing(user.id, values, photos, setProgress)
        clearLocalDraft()
      } else {
        savedId = props.listingId
        await updateListing(user.id, props.listingId, values, photos, { publish: isDraftEdit }, setProgress)
        void queryClient.invalidateQueries({ queryKey: listingKeys.edit(props.listingId) })
      }
      void queryClient.invalidateQueries({ queryKey: listingKeys.mine(user.id) })
      if (IS_APP && willPublish) haptic('success')
      navigate(`/account/listings?notice=${willPublish ? 'published' : 'saved'}&id=${savedId}`, { replace: true })
    } catch (error) {
      setProgress(null)
      if (error instanceof DraftSavedError) {
        // the listing exists as a draft: continue on its edit page
        clearLocalDraft()
        void queryClient.invalidateQueries({ queryKey: listingKeys.mine(user.id) })
        navigate(`/a/${error.listingId}/edit?error=${encodeURIComponent(errorToKey(error.reason))}`, {
          replace: true,
        })
        return
      }
      setSubmitError(errorToKey(error))
    }
  }

  // Validation failed on the last step: jump to the first step with an error.
  function onInvalid(errors: Record<string, unknown>) {
    const firstStep = steps.find((s) => (STEP_FIELDS[s] as readonly string[]).some((field) => field in errors))
    if (firstStep) goTo(firstStep)
  }

  const blocked = profile.data?.is_blocked === true

  const isLast = step === 'publish'

  return (
    <FormProvider {...methods}>
      {IS_APP && (
        <Sheet open={leaveOpen} onClose={() => setLeaveOpen(false)} title={t('appShell.leaveFormTitle')}>
          <p className="mb-4 text-muted">{t('appShell.leaveFormText')}</p>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                if (props.mode === 'new') saveLocalDraft(getValues())
                navigate(-1)
              }}
            >
              {t('appShell.leave')}
            </Button>
            <Button variant="secondary" onClick={() => setLeaveOpen(false)}>
              {t('appShell.stay')}
            </Button>
          </div>
        </Sheet>
      )}
      <form
        onSubmit={(event) => {
          // Enter in a field moves to the next step; only the last step really submits.
          if (!isLast) {
            event.preventDefault()
            if (step !== 'category') void next()
            return
          }
          // Publishing happens only through the "Publică anunțul" button (data-publish), never through
          // a button that was "Continuă" a moment before.
          const submitter = (event.nativeEvent as SubmitEvent).submitter
          if (!submitter?.hasAttribute('data-publish')) {
            event.preventDefault()
            return
          }
          void handleSubmit(onSubmit, onInvalid)(event)
        }}
        noValidate
        className="mx-auto max-w-3xl"
      >
        <StepIndicator steps={steps} current={stepIndex} />

        {blocked && (
          <div className="mb-4">
            <Alert kind="warning">{t('account.blockedNotice')}</Alert>
          </div>
        )}

        {/* every step is one screen */}
        <section aria-labelledby="step-heading" className="rounded-panel border border-line bg-surface p-4 sm:p-6">
          <h2 id="step-heading" className="mb-5 type-h2 text-ink">
            {translateKey(t, `listingForm.steps.${step}`)}
          </h2>

          {step === 'category' && <CategoryStep selected={categorySlug} onChoose={chooseCategory} />}

          {step === 'photos' && category && (
            <PhotoUploader
              photos={photos}
              onChange={(next) => {
                setPhotos(next)
                if (photoError && next.length >= category.minPhotos) setPhotoError(undefined)
              }}
              minPhotos={category.minPhotos}
              needs={translateKey(t, `listingForm.photoNeeds.${category.slug}`)}
              error={photoError}
            />
          )}

          {step === 'details' && category && <DetailsStep category={category} />}

          {step === 'characteristics' && category && (
            <div className="space-y-6">
              <AttributeFields category={category} />
              {category.privateField && <PrivateField field={category.privateField} />}
              {category.hasCompatibility && <CompatibilityEditor />}
            </div>
          )}

          {step === 'publish' && category && <PublishStep category={category} photos={photos} />}

          {submitError && (
            <div className="mt-5">
              <Alert kind="error">{translateKey(t, submitError)}</Alert>
            </div>
          )}
          {progress && <SaveProgressBar progress={progress} />}
        </section>

        {props.mode === 'new' && step !== 'category' && (
          <p className="mt-4 text-center text-sm text-muted">
            {t('listingForm.localDraftHint')}{' '}
            <button
              type="button"
              className="inline-flex min-h-11 items-center font-medium text-brand underline-offset-2 hover:underline"
              onClick={() => {
                clearLocalDraft()
                methods.reset(EMPTY_LISTING)
                setPhotos([])
                goTo('category')
              }}
            >
              {t('listingForm.startOver')}
            </button>
          </p>
        )}

        {/*
          "Continuă" stays at the bottom of the phone screen, "Înapoi" is a link above it
          (plan de design, 6.4). On computers both sit under the form.
        */}
        {step !== 'category' && (
          <div
            className={
              IS_APP
                ? appBottomPanelClass + ' z-30 border-t border-line bg-surface px-4 pt-1 pb-3 shadow-float'
                : 'fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-float lg:static lg:mt-4 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none'
            }
          >
            <div className="mx-auto flex max-w-xl flex-col lg:mx-0 lg:max-w-none lg:flex-row lg:items-center lg:justify-between">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  disabled={Boolean(progress)}
                  onClick={() => goTo(steps[stepIndex - 1])}
                  className="inline-flex min-h-11 items-center gap-1 self-start font-medium text-brand hover:underline disabled:text-muted lg:self-auto"
                >
                  <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={1.75} />
                  {t('listingForm.back')}
                </button>
              ) : (
                <span />
              )}
              {/*
                Two different buttons (key), never one button that changes its type: otherwise the
                click on "Continuă" of step 4 turned the same button into "Publică" during that click
                and the browser published the listing on its own.
              */}
              {isLast ? (
                <Button
                  key="publish"
                  data-publish=""
                  type="submit"
                  variant={willPublish ? 'action' : 'primary'}
                  loading={Boolean(progress)}
                  disabled={blocked}
                  className="w-full lg:w-auto lg:min-w-56"
                >
                  {willPublish ? t('listingForm.publish') : t('listingForm.saveChanges')}
                </Button>
              ) : (
                <Button key="next" onClick={() => void next()} className="w-full lg:w-auto lg:min-w-56">
                  {t('listingForm.next')}
                </Button>
              )}
            </div>
          </div>
        )}
      </form>
    </FormProvider>
  )
}

/** While publishing: a progress bar with "Se încarcă pozele: 2 din 5". */
function SaveProgressBar({ progress }: { progress: SaveProgress }) {
  const { t } = useTranslation()
  const percent =
    progress.stage === 'photos' && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : progress.stage === 'publishing'
        ? 100
        : 5
  return (
    <div className="mt-5 space-y-2" aria-live="polite">
      <p className="text-sm text-ink">
        {progress.stage === 'photos'
          ? t('listingForm.progressPhotos', { done: progress.done, total: progress.total })
          : progress.stage === 'publishing'
            ? t('listingForm.progressPublishing')
            : t('listingForm.progressSaving')}
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

/**
 * Phones: "Pasul 2 din 5" and a progress bar. Computers: all steps on one row, numbered,
 * the finished ones with a tick (plan de design, 6.4).
 */
function StepIndicator({ steps, current }: { steps: WizardStep[]; current: number }) {
  const { t } = useTranslation()
  const stepOf = t('listingForm.stepOf', { current: current + 1, total: steps.length })
  return (
    <div className="mb-5">
      <div className="lg:hidden">
        <p className="mb-2 text-sm font-medium text-ink">
          {stepOf}
          <span className="font-normal text-muted">
            {' '}
            · {translateKey(t, `listingForm.stepNames.${steps[current]}`)}
          </span>
        </p>
        <div
          role="progressbar"
          aria-label={stepOf}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={current + 1}
          className="h-1.5 overflow-hidden rounded-full bg-line"
        >
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${((current + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <ol className="hidden items-center gap-2 lg:flex" aria-label={stepOf}>
        {steps.map((step, index) => {
          const done = index < current
          const active = index === current
          return (
            <li
              key={step}
              className="flex flex-1 items-center gap-2 last:flex-none"
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular ${
                  active ? 'bg-brand text-white' : done ? 'bg-brand-50 text-brand' : 'bg-line text-muted'
                }`}
              >
                {done ? <Check aria-hidden="true" className="size-4" strokeWidth={2.5} /> : index + 1}
              </span>
              <span className={`text-sm whitespace-nowrap ${active ? 'font-semibold text-ink' : 'text-muted'}`}>
                {translateKey(t, `listingForm.stepNames.${step}`)}
              </span>
              {index < steps.length - 1 && <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-line" />}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function CategoryStep({ selected, onChoose }: { selected: string; onChoose: (slug: string) => void }) {
  const { t } = useTranslation()
  return (
    <ul className="grid grid-cols-2 gap-3">
      {CATEGORY_SLUGS.map((slug) => (
        <li key={slug} className="flex">
          <button
            type="button"
            onClick={() => onChoose(slug)}
            aria-pressed={selected === slug}
            className={`flex min-h-32 w-full flex-1 flex-col items-center justify-center gap-2 rounded-card border p-4 text-center font-medium text-ink hover:border-brand ${
              selected === slug ? 'border-brand bg-brand-50' : 'border-line bg-surface'
            }`}
          >
            <span className="text-brand">
              <CategoryIcon name={CATEGORIES[slug].icon} className="size-7" />
            </span>
            <span>{t(`categories.${slug}`)}</span>
            <span className="text-sm font-normal text-muted">
              {t('listingForm.minPhotosShort', { count: CATEGORIES[slug].minPhotos })}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function DetailsStep({ category }: { category: CategoryConfig }) {
  const { t, i18n } = useTranslation()
  const lng = i18n.resolvedLanguage
  const fieldError = useFieldError()
  const localities = useLocalities()
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ListingFormValues>()
  const [description, currency] = useWatch({ control, name: ['description', 'currency'] })

  return (
    <div className="space-y-5">
      <TextField
        label={t('listingForm.title')}
        hint={t('listingForm.titleHint')}
        maxLength={100}
        error={fieldError(errors.title)}
        {...register('title')}
      />

      <div>
        <FieldLabel htmlFor="listing-description" label={t('listingForm.description')} optional />
        <textarea
          id="listing-description"
          rows={6}
          maxLength={5000}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={errors.description ? 'listing-description-error' : undefined}
          className={inputClass(Boolean(errors.description))}
          {...register('description')}
        />
        {errors.description ? (
          <FieldError id="listing-description-error">{fieldError(errors.description) ?? ''}</FieldError>
        ) : (
          <p className="mt-1.5 text-right text-sm text-muted tabular">{(description ?? '').length}/5000</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <TextField
          label={t('listingForm.price')}
          inputMode="decimal"
          unit={currencyUnit(currency, lng)}
          error={fieldError(errors.price)}
          {...register('price')}
        />
        <Controller
          control={control}
          name="currency"
          render={({ field }) => (
            <ChipGroup
              label={t('listingForm.currency')}
              options={[
                { value: 'MDL', label: currencyUnit('MDL', lng) },
                { value: 'EUR', label: '€' },
              ]}
              value={field.value}
              // a currency is always chosen: pressing the chosen one again keeps it
              onChange={(next) => {
                if (next) field.onChange(next)
              }}
            />
          )}
        />
      </div>
      <CheckboxField label={t('listingForm.negotiable')} {...register('negotiable')} />

      <Controller
        control={control}
        name="condition"
        render={({ field }) => (
          <ChipGroup
            label={t('listingForm.condition')}
            options={(['new', 'used'] as const).map((value) => ({
              value,
              label: translateKey(t, `listingForm.conditionOptions.${category.conditionLabels}.${value}`),
            }))}
            value={field.value}
            onChange={(next) => field.onChange(next)}
            error={fieldError(errors.condition)}
          />
        )}
      />

      <SelectField label={t('listingForm.locality')} error={fieldError(errors.localityId)} {...register('localityId')}>
        <option value="">{t('listingForm.choose')}</option>
        {(localities.data ?? []).map((locality) => (
          <option key={locality.id} value={String(locality.id)}>
            {localizedName(locality, lng)}
          </option>
        ))}
      </SelectField>
    </div>
  )
}

function PrivateField({ field }: { field: 'imei' | 'vin' }) {
  const { t } = useTranslation()
  const fieldError = useFieldError()
  const {
    register,
    formState: { errors },
  } = useFormContext<ListingFormValues>()

  return (
    <div className="rounded-card border border-line bg-paper p-4">
      <TextField
        label={t(field === 'imei' ? 'listingForm.imei' : 'listingForm.vin')}
        optional
        hint={t(field === 'imei' ? 'listingForm.imeiHint' : 'listingForm.vinHint')}
        inputMode={field === 'imei' ? 'numeric' : 'text'}
        autoCapitalize={field === 'vin' ? 'characters' : undefined}
        maxLength={field === 'imei' ? 20 : 21}
        autoComplete="off"
        error={fieldError(field === 'imei' ? errors.imei : errors.vin)}
        {...register(field)}
      />
    </div>
  )
}

/** Contact, then the card exactly as it will appear in the list (plan de design, 6.4). */
function PublishStep({ category, photos }: { category: CategoryConfig; photos: PhotoItem[] }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { control } = useFormContext<ListingFormValues>()
  const values = useWatch({ control }) as ListingFormValues
  // the card shows "azi, 14:32": the moment the step was opened
  const [now] = useState(() => new Date().toISOString())

  const preview = {
    id: 'preview',
    userId: user?.id ?? '',
    categoryId: category.id,
    title: values.title,
    price: parsePrice(values.price),
    currency: values.currency,
    negotiable: values.negotiable,
    condition: values.condition,
    localityId: Number(values.localityId),
    attributes: buildAttributes(category, values.attributes ?? {}),
    createdAt: now,
    coverPath: null,
    hasImei: category.privateField === 'imei' && isValidImei(values.imei ?? ''),
    hasVin: category.privateField === 'vin' && isValidVin(values.vin ?? ''),
  }

  return (
    <div className="space-y-6">
      <PhoneSection />
      <div>
        <h3 className="mb-1 font-semibold text-ink">{t('listingForm.previewTitle')}</h3>
        <p className="mb-3 text-sm text-muted">{t('listingForm.previewHint')}</p>
        <div className="w-[min(100%,15rem)]">
          <ListingCard listing={preview} preview coverUrl={photos[0]?.previewUrl} />
        </div>
      </div>
      <p className="text-sm text-muted">{t('listingForm.publishHint')}</p>
    </div>
  )
}

/** Contact: the seller's phone from the profile, editable right here. */
function PhoneSection() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const phone = useMyPhone(user?.id)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!user) return
    const normalized = normalizePhone(value)
    if (normalized !== '' && !PHONE_PATTERN.test(normalized)) {
      setError(t('validation.phone'))
      return
    }
    setSaving(true)
    try {
      await updateMyPhone(user.id, normalized)
      await queryClient.invalidateQueries({ queryKey: profileKeys.myPhone(user.id) })
      setEditing(false)
      setError(undefined)
    } catch (e) {
      setError(translateKey(t, errorToKey(e)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h3 className="mb-2 font-semibold text-ink">{t('listingForm.contactTitle')}</h3>
      {editing ? (
        <div className="flex flex-wrap items-end gap-2">
          <TextField
            className="min-w-0 flex-1"
            label={t('account.phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={value}
            error={error}
            onChange={(e) => setValue(e.target.value)}
            // Enter saves the phone; it must never send the whole form (that would publish the listing)
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void save()
              }
            }}
          />
          <Button loading={saving} onClick={() => void save()}>
            {t('account.save')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-field border border-line p-3">
          <span className="text-ink">
            {phone.data ? (
              <>
                {t('account.phone')}: <strong>{phone.data}</strong>
              </>
            ) : (
              <span className="text-ink">{t('listingForm.noPhone')}</span>
            )}
          </span>
          <Button
            variant="ghost"
            onClick={() => {
              setValue(phone.data ?? '')
              setEditing(true)
            }}
          >
            {phone.data ? t('listingForm.changePhone') : t('listingForm.addPhone')}
          </Button>
        </div>
      )}
      <p className="mt-1.5 text-sm text-muted">{t('account.phoneHint')}</p>
    </div>
  )
}
