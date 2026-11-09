// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parentRoute, resolveScreenRoute } from './routes'
describe('screen routes', () => {
  it.each(['/', '/search', '/c/phones', '/messages', '/account', '/search/'])('recognizes main %s', (path) => {
    expect(resolveScreenRoute(path).kind).toBe('main')
  })
  it.each(['/new', '/login', '/messages/42', '/account/settings', '/a/42/edit', '/unknown', '/c/phones/other'])(
    'recognizes inner %s',
    (path) => {
      expect(resolveScreenRoute(path).kind).toBe('inner')
    },
  )
  it('matches listing exactly and conversation separately', () => {
    expect(resolveScreenRoute('/a/42').header).toBe('overlay')
    expect(resolveScreenRoute('/a/42/edit').header).toBe('inner')
    expect(resolveScreenRoute('/messages/42').header).toBe('inner')
  })
  it('provides safe direct-entry back destinations', () => {
    expect(parentRoute('/messages/42')).toBe('/messages')
    expect(parentRoute('/account/settings/profile')).toBe('/account/settings')
    expect(parentRoute('/a/42/edit')).toBe('/a/42')
    expect(parentRoute('/login')).toBe('/')
  })
})
