import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from 'react'
import type { HeaderKind } from './routes'

export type ScreenHeaderOptions = {
  title?: ReactNode
  actions?: readonly ReactNode[]
  header?: HeaderKind
  onBack?: () => void
  /** Gallery bottom in document pixels; defaults to 320. */
  overlayUntil?: number
}
export const ScreenHeaderContext = createContext<{
  set: (owner: symbol, options: ScreenHeaderOptions) => void
  clear: (owner: symbol) => void
} | null>(null)
/** Override the shell header while this screen is mounted; actions must have accessible labels. */
export function useScreenHeader(options: ScreenHeaderOptions): void {
  const context = useContext(ScreenHeaderContext)
  const owner = useRef(Symbol('screen-header'))
  useLayoutEffect(() => {
    context?.set(owner.current, options)
  }, [context, options])
  useLayoutEffect(() => () => context?.clear(owner.current), [context])
}
