/**
 * StatRow — 4-column grid of KPI stat cards.
 */

interface StatRowProps {
  readonly children: React.ReactNode;
  readonly className?: string;
}

/** Wraps stat cards in a 4-column .stat-row grid. */
export function StatRow({ children, className }: StatRowProps) {
  return (
    <div className={`stat-row${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
