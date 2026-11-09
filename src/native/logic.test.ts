// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { classifyLink, createBackStack } from './logic'

describe('Back handlers', () => {
  it('runs newest first and stops at the first handled Back', () => {
    const stack = createBackStack()
    const calls: number[] = []
    stack.add(() => {
      calls.push(1)
      return true
    })
    stack.add(() => {
      calls.push(2)
      return true
    })
    const remove = stack.add(() => {
      calls.push(3)
      return false
    })
    expect(stack.run()).toBe(true)
    expect(calls).toEqual([3, 2])
    remove()
    remove()
    calls.length = 0
    stack.run()
    expect(calls).toEqual([2])
  })
  it('falls through an empty stack and unhandled handlers', () => {
    const stack = createBackStack()
    expect(stack.run()).toBe(false)
    stack.add(() => false)
    expect(stack.run()).toBe(false)
  })
})

describe('link classification', () => {
  const base = 'https://localhost/#/search'
  it.each([
    'tel:+3731234',
    'mailto:a@example.com',
    'sms:123',
    'viber://chat',
    'whatsapp://send',
    'tg://resolve',
    'geo:0,0',
    'https://example.com/',
    '//example.com/',
  ])('opens external %s', (href) => {
    expect(classifyLink(href, base)).toBe('external')
  })
  it('keeps HashRouter links inside even with target blank', () => {
    expect(classifyLink('#/messages', base, '_blank')).toBe('internal')
    expect(classifyLink('https://localhost/#/account', base)).toBe('internal')
    expect(classifyLink('/help', base)).toBe('internal')
    expect(classifyLink('/help', base, '_BLANK')).toBe('external')
  })
  it.each(['javascript:alert(1)', 'data:text/html,hi', 'file:///test', 'intent://test', 'http://[invalid'])(
    'blocks %s',
    (href) => {
      expect(classifyLink(href, base, '_blank')).toBe('blocked')
    },
  )
})

describe('owned history', () => {
  it('tracks pushes, replacements and duplicate pop/hash events', async () => {
    const { trackHistory } = await import('./logic')
    const callbacks: Record<string, (() => void)[]> = {}
    const location = { href: 'https://localhost/#/' }
    let state: Record<string, unknown> = {}
    const history = {
      get state() {
        return state
      },
      pushState(next: Record<string, unknown>, _unused: string, url?: string | URL | null) {
        state = next
        if (url) location.href = new URL(url, location.href).href
      },
      replaceState(next: Record<string, unknown>, _unused: string, url?: string | URL | null) {
        state = next
        if (url) location.href = new URL(url, location.href).href
      },
    }
    const win = {
      history,
      location,
      addEventListener(name: string, fn: () => void) {
        ;(callbacks[name] ??= []).push(fn)
      },
    }
    const emit = () => {
      callbacks.popstate.forEach((fn) => fn())
      callbacks.hashchange.forEach((fn) => fn())
    }
    const canBack = trackHistory(win as unknown as Window)
    const initial = state
    expect(canBack()).toBe(false)
    history.replaceState({ idx: 0 }, '', '#/search')
    expect(canBack()).toBe(false)
    history.pushState({ idx: 1 }, '', '#/account')
    const pushed = state
    expect(canBack()).toBe(true)
    state = initial
    location.href = 'https://localhost/#/'
    emit()
    expect(canBack()).toBe(false)
    state = pushed
    location.href = 'https://localhost/#/account'
    emit()
    expect(canBack()).toBe(true)
    state = {}
    location.href = 'https://localhost/#/messages'
    emit()
    expect(canBack()).toBe(true)
    state = initial
    location.href = 'https://localhost/#/'
    emit()
    expect(canBack()).toBe(false)
  })
})
