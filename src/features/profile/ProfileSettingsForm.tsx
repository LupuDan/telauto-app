import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { SelectField } from '../../components/ui/SelectField'
import { TextField } from '../../components/ui/TextField'
import { useFieldError } from '../../components/ui/useFieldError'
import { translateKey } from '../../i18n/translate'
import { localizedName, toLanguage } from '../../lib/format'
import { errorToKey } from '../auth/authErrors'
import { useLocalities } from '../reference/hooks'
import { AvatarField } from './AvatarField'
import type { PublicProfile } from './api'
import { useUpdateMyProfile } from './hooks'
import { profileSettingsSchema, type ProfileSettingsInput, type ProfileSettingsOutput } from './schemas'

type Props = { userId: string; profile: PublicProfile; phone: string }

export function ProfileSettingsForm({ userId, profile, phone }: Props) {
  const { t, i18n } = useTranslation()
  const fieldError = useFieldError()
  const localities = useLocalities()
  const update = useUpdateMyProfile(userId)
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileSettingsInput, unknown, ProfileSettingsOutput>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      displayName: profile.display_name,
      localityId: profile.locality_id ? String(profile.locality_id) : '',
      phone,
      // the language is chosen with RO | RU on the main account screen; saving keeps the profile in step
      language: toLanguage(i18n.resolvedLanguage),
    },
  })

  async function onSubmit(values: ProfileSettingsOutput) {
    setSaved(false)
    try {
      await update.mutateAsync({
        displayName: values.displayName,
        localityId: values.localityId ? Number(values.localityId) : null,
        language: values.language,
        phone: values.phone,
      })
    } catch {
      return // shown through update.isError
    }
    reset({ ...values })
    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4" onChange={() => setSaved(false)}>
      <AvatarField userId={userId} profile={profile} />

      {update.isError && <Alert kind="error">{translateKey(t, errorToKey(update.error))}</Alert>}
      {saved && !isDirty && <Alert kind="success">{t('account.saved')}</Alert>}

      <TextField
        label={t('account.displayName')}
        autoComplete="name"
        maxLength={60}
        error={fieldError(errors.displayName)}
        {...register('displayName')}
      />

      <SelectField label={t('account.locality')} error={fieldError(errors.localityId)} {...register('localityId')}>
        <option value="">{t('account.localityNone')}</option>
        {(localities.data ?? []).map((locality) => (
          <option key={locality.id} value={String(locality.id)}>
            {localizedName(locality, i18n.resolvedLanguage)}
          </option>
        ))}
      </SelectField>

      <TextField
        label={t('account.phone')}
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="+373 69 123 456"
        hint={t('account.phoneHint')}
        error={fieldError(errors.phone)}
        {...register('phone')}
      />

      {/*
        fixed at the bottom of the screen (above the bottom bar on phones);
        active only after a change (plan de design, 6.6)
      */}
      <div className="sticky bottom-[calc(4.5rem+var(--app-inset-bottom,env(safe-area-inset-bottom)))] -mx-4 border-t border-line bg-surface px-4 py-3 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:pt-2 lg:pb-0">
        <Button type="submit" fullWidth loading={isSubmitting} disabled={!isDirty} className="lg:w-auto lg:min-w-48">
          {t('account.save')}
        </Button>
      </div>
    </form>
  )
}
