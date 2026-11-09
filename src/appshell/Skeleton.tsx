export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-card border border-line bg-surface p-3">
          <div className="aspect-square rounded-field bg-line motion-safe:animate-pulse" />
          <div className="h-4 w-3/4 rounded-field bg-line" />
          <div className="h-4 w-1/2 rounded-field bg-line" />
        </div>
      ))}
    </div>
  )
}
export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-3 rounded-card border border-line bg-surface p-4">
          <div className="size-12 shrink-0 rounded-field bg-line motion-safe:animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-3/4 rounded-field bg-line" />
            <div className="h-4 w-1/2 rounded-field bg-line" />
          </div>
        </div>
      ))}
    </div>
  )
}
