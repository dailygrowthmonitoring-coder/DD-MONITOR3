interface SkeletonCardProps {
  className?: string
  lines?: number
}

export function SkeletonCard({ className = '', lines = 3 }: SkeletonCardProps) {
  return (
    <div
      className={`bg-app-card border border-app-border rounded-lg p-5 animate-pulse ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-app-border" />
        <div className="h-4 bg-app-border rounded w-36" />
        <div className="ml-auto h-4 bg-app-border rounded w-16" />
      </div>
      <div className="h-1.5 bg-app-border rounded-full mb-4" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-3 bg-app-border rounded" style={{ width: `${70 + i * 10}%` }} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonText({ className = '' }: { className?: string }) {
  return <div className={`h-4 bg-app-border rounded animate-pulse ${className}`} />
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`bg-app-border rounded animate-pulse ${className}`} />
}
