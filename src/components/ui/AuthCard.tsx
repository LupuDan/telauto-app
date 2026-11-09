import { useScreenHeader } from '../../appshell'
import { IS_APP } from '../../native'
import type { ReactNode } from 'react'
import { Logo } from '../Logo'

/**
 * Login / register / reset (plan de design, 6.7): centred form, at most 400 px wide,
 * the logo above it and nothing else to distract.
 */
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  useScreenHeader(IS_APP ? { title, header: 'inner' } : {})
  return (
    <div className="mx-auto w-full max-w-[400px] py-2 sm:py-6">
      <div className={IS_APP ? 'hidden' : 'mb-6 flex justify-center'}>
        <Logo variant="full" />
      </div>
      <section className="rounded-panel border border-line bg-surface p-5 sm:p-6">
        <h1 className={IS_APP ? 'sr-only' : 'mb-5 type-h1 text-ink'}>{title}</h1>
        {children}
      </section>
    </div>
  )
}
