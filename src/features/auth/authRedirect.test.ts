import { describe, expect, it } from 'vitest'
import { authConfirmRoute } from './authRedirect'

describe('authConfirmRoute (email links)', () => {
  it('website link with a code', () => {
    expect(authConfirmRoute('https://lupudan.github.io/telauto/?flow=signup&code=abc')).toBe(
      '#/auth/confirm?code=abc&flow=signup',
    )
  })

  it('app link with a code (md.telauto.app://)', () => {
    expect(authConfirmRoute('md.telauto.app://auth/?flow=recovery&code=xyz')).toBe(
      '#/auth/confirm?code=xyz&flow=recovery',
    )
  })

  it('expired link (error in the hash)', () => {
    expect(authConfirmRoute('md.telauto.app://auth/?flow=signup#error=access_denied&error_code=otp_expired')).toBe(
      '#/auth/confirm?error_code=otp_expired&flow=signup',
    )
  })

  it('ignores unknown flows and ordinary addresses', () => {
    expect(authConfirmRoute('md.telauto.app://auth/?flow=evil&code=1')).toBe('#/auth/confirm?code=1')
    expect(authConfirmRoute('https://lupudan.github.io/telauto/#/a/5')).toBeNull()
    expect(authConfirmRoute('not a url')).toBeNull()
  })
})
