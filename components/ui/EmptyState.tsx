/**
 * EmptyState — displayed when a table or list has no data or an error.
 */

import { Spinner } from './Spinner';

interface EmptyStateProps {
  readonly title?: string;
  readonly message?: string;
  readonly loading?: boolean;
  readonly icon?: React.ReactNode;
}

/** Renders a centered empty/error/loading state for panels and tables. */
export function EmptyState({
  title = 'No data',
  message,
  loading = false,
  icon,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      {loading ? (
        <Spinner size="lg" />
      ) : (
        <>
          {icon && <div className="empty-state-icon">{icon}</div>}
          <div className="empty-state-title">{title}</div>
          {message && <div className="empty-state-sub">{message}</div>}
        </>
      )}
    </div>
  );
}
