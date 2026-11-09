import { IS_APP } from '../native'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router'
import { usePageMeta } from '../app/usePageMeta'
import { Alert } from '../components/ui/Alert'
import { AuthCard } from '../components/ui/AuthCard'
import { Button } from '../components/ui/Button'
import { CheckboxField } from '../components/ui/CheckboxField'
import { PasswordField } from '../components/ui/PasswordField'
import { TextField } from '../components/ui/TextField'
import { useFieldError } from '../components/ui/useFieldError'
import { resendConfirmation, signUp } from '../features/auth/api'
import { useAuth } from '../features/auth/authContext'
import { errorToKey } from '../features/auth/authErrors'
import { registerSchema, type RegisterValues } from '../features/auth/schemas'
import { translateKey } from '../i18n/translate'
import { toLanguage } from '../lib/format'

export function RegisterPage() {
  const { t, i18n } = useTranslation()
  usePageMeta(t('auth.registerMetaTitle'))
  const fieldError = useFieldError()
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { acceptTerms: false },
  })

  if (!loading && user && !sentTo) {
    return <Navigate to="/account" replace />
  }

  async function onSubmit(values: RegisterValues) {
    setErrorKey(null)
    try {
      const result = await signUp({
        email: values.email,
        password: values.password,
        displayName: values.displayName,
        language: toLanguage(i18n.resolvedLanguage),
      })
      if (result === 'signed-in') {
        navigate('/account', { replace: true })
      } else {
        setSentTo(values.email)
      }
    } catch (error) {
      setErrorKey(errorToKey(error))
    }
  }

  async function onResend() {
    if (!sentTo) return
    setResendState('sending')
    try {
      await resendConfirmation(sentTo)
      setResendState('sent')
    } catch (error) {
      setResendState('idle')
      setErrorKey(errorToKey(error))
    }
  }

  if (sentTo) {
    return (
      <AuthCard title={t('auth.registerSuccessTitle')}>
        <div className="space-y-4">
          <p className="text-ink">{t('auth.registerSuccessText', { email: sentTo })}</p>
          <p className="text-sm text-muted">{t(IS_APP ? 'appShell.checkEmailOnPhone' : 'auth.registerSuccessHint')}</p>
          {errorKey && <Alert kind="error">{translateKey(t, errorKey)}</Alert>}
          {resendState === 'sent' ? (
            <Alert kind="success">{t('auth.resendSuccess')}</Alert>
          ) : (
            <Button variant="secondary" fullWidth loading={resendState === 'sending'} onClick={onResend}>
              {t('auth.resendConfirmation')}
            </Button>
          )}
          <p className="text-center text-sm">
            <Link to="/login" className="font-semibold text-brand hover:underline">
              {t('auth.goToLogin')}
            </Link>
          </p>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('auth.registerTitle')}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {errorKey && <Alert kind="error">{translateKey(t, errorKey)}</Alert>}

        <TextField
          label={t('auth.displayName')}
          hint={t('auth.displayNameHint')}
          autoComplete="name"
          maxLength={60}
          error={fieldError(errors.displayName)}
          {...register('displayName')}
        />
        <TextField
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          inputMode="email"
          error={fieldError(errors.email)}
          {...register('email')}
        />
        <PasswordField
          label={t('auth.password')}
          autoComplete="new-password"
          hint={t('auth.passwordHint')}
          error={fieldError(errors.password)}
          {...register('password')}
        />
        <PasswordField
          label={t('auth.passwordConfirm')}
          autoComplete="new-password"
          error={fieldError(errors.passwordConfirm)}
          {...register('passwordConfirm')}
        />
        <CheckboxField
          label={
            <>
              {t('auth.acceptTermsPrefix')}{' '}
              <Link to="/p/terms" target="_blank" className="text-brand underline">
                {t('auth.termsLink')}
              </Link>{' '}
              {t('auth.and')}{' '}
              <Link to="/p/privacy" target="_blank" className="text-brand underline">
                {t('auth.privacyLink')}
              </Link>
            </>
          }
          error={fieldError(errors.acceptTerms)}
          {...register('acceptTerms')}
        />

        <Button type="submit" fullWidth loading={isSubmitting}>
          {t('auth.registerButton')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          {t('auth.loginLink')}
        </Link>
      </p>
    </AuthCard>
  )
}
