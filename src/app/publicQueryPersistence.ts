import type { Query } from '@tanstack/react-query'

function isPublicSuccess(query: Query) {
  if (query.state.status !== 'success') return false
  const key = query.queryKey[0]
  if (key === 'listing') {
    // RLS also returns an author's drafts: the key alone is not a privacy boundary.
    const data = query.state.data as { status?: string; expired?: boolean; expiresAt?: string } | null
    return data?.status === 'active' && data.expired === false && Date.parse(data.expiresAt ?? '') > Date.now()
  }
  return key === 'search' || key === 'localities' || key === 'reference'
}

export const publicDehydrateOptions = {
  shouldDehydrateQuery: isPublicSuccess,
  shouldDehydrateMutation: () => false,
}
