import type { PropsWithChildren } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { publicDehydrateOptions } from './publicQueryPersistence'

const DAY = 24 * 60 * 60_000

// Storage may be unavailable or full. Persistence must never prevent the app from opening.
const persister = createAsyncStoragePersister({
  key: 'telauto.public-query-cache',
  storage: {
    getItem: async (key) => {
      try {
        return localStorage.getItem(key)
      } catch {
        return null
      }
    },
    setItem: async (key, value) => {
      try {
        localStorage.setItem(key, value)
      } catch {
        /* best effort */
      }
    },
    removeItem: async (key) => {
      try {
        localStorage.removeItem(key)
      } catch {
        /* best effort */
      }
    },
  },
})

const persistOptions = {
  persister,
  maxAge: DAY,
  buster: import.meta.env.VITE_APP_BUILD_VERSION,
  dehydrateOptions: publicDehydrateOptions,
}

export function AppQueryProvider({ client, children }: PropsWithChildren<{ client: QueryClient }>) {
  return (
    <PersistQueryClientProvider client={client} persistOptions={persistOptions}>
      {children}
    </PersistQueryClientProvider>
  )
}
