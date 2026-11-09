import { getSiteBaseUrl } from '../../lib/siteUrl'
import { APP_AUTH_URL, IS_APP } from '../../native/platform'
import { supabase } from '../../lib/supabase'
import type { Language } from '../../i18n'
import { AppError } from './authErrors'

function emailRedirect(flow: 'signup' | 'recovery'): string {
  // In the app the link must come back into the app (PKCE: the code can only be exchanged where it was requested).
  return `${IS_APP ? APP_AUTH_URL : getSiteBaseUrl()}?flow=${flow}`
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

/**
 * Creates the account and sends the confirmation email.
 * Returns "confirm-email" normally, or "signed-in" if email confirmation is disabled in Supabase.
 * For privacy Supabase does not say if the email is already registered: in that case no email is sent.
 */
export async function signUp(params: {
  email: string
  password: string
  displayName: string
  language: Language
}): Promise<'confirm-email' | 'signed-in'> {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      emailRedirectTo: emailRedirect('signup'),
      data: { display_name: params.displayName, language: params.language },
    },
  })
  if (error) throw error
  return data.session ? 'signed-in' : 'confirm-email'
}

export async function resendConfirmation(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: emailRedirect('signup') },
  })
  if (error) throw error
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: emailRedirect('recovery') })
  if (error) throw error
}

export async function setNewPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

/** Checks the current password again before sensitive actions (change password, delete account). */
export async function verifyCurrentPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    throw new AppError(error.code === 'invalid_credentials' ? 'errors.wrongPassword' : 'errors.generic')
  }
}

export async function changePassword(email: string, currentPassword: string, newPassword: string) {
  await verifyCurrentPassword(email, currentPassword)
  await setNewPassword(newPassword)
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    // the session may already be invalid on the server; still log out locally
    await supabase.auth.signOut({ scope: 'local' })
  }
}

/** Finishes the email-link login: "?code=" (PKCE) or "token_hash" (custom email templates). */
export async function exchangeCode(code: string) {
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) throw error
}

export async function verifyEmailToken(tokenHash: string, type: 'email' | 'recovery') {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
  if (error) throw error
}
