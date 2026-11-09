import { dehydrate, hydrate, QueryClient } from '@tanstack/react-query'
import { expect, it } from 'vitest'
import { publicDehydrateOptions } from './publicQueryPersistence'

it('restores public browse data while excluding account data and non-public listing details', () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
  const publicKeys = [
    ['search', 'infinite', { p_limit: 12, p_offset: 0 }],
    ['localities'],
    ['reference', 'phoneBrand', null],
    ['listing', 'public'],
  ]
  for (const key of publicKeys) {
    client.setQueryData(
      key,
      key[0] === 'listing'
        ? { status: 'active', expired: false, expiresAt: new Date(Date.now() + 60_000).toISOString() }
        : { items: ['public'] },
    )
  }
  for (const key of ['messages', 'profile', 'favorites', 'my-listings', 'listing-edit', 'vehicles']) {
    client.setQueryData([key, 'user'], { private: true })
  }
  for (const status of ['draft', 'sold', 'deleted']) {
    client.setQueryData(['listing', status], { status, expired: false, expiresAt: '2099-01-01' })
  }
  client.setQueryData(['listing', 'expired'], { status: 'active', expired: false, expiresAt: '2000-01-01' })
  client.setQueryData(['listing', 'missing'], null)
  client.getMutationCache().build(
    client,
    {},
    {
      status: 'pending',
      variables: { private: true },
      context: undefined,
      data: undefined,
      error: null,
      failureCount: 0,
      failureReason: null,
      isPaused: true,
      submittedAt: Date.now(),
    },
  )
  const stored = JSON.parse(JSON.stringify(dehydrate(client, publicDehydrateOptions)))
  const restored = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
  hydrate(restored, stored)
  expect(
    restored
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey),
  ).toEqual(publicKeys)
  expect(stored.mutations).toEqual([])
  client.clear()
  restored.clear()
})

it('does not persist pending or failed public requests', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  await client
    .fetchQuery({ queryKey: ['search', 'failed'], queryFn: () => Promise.reject(new Error('offline')) })
    .catch(() => {})
  client.getQueryCache().build(client, { queryKey: ['reference', 'pending'] })
  expect(dehydrate(client, publicDehydrateOptions).queries).toEqual([])
  client.clear()
})
