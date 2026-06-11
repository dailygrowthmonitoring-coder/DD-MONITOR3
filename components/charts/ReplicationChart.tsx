'use client';

/**
 * ReplicationChart — placeholder throughput chart for replication page.
 * Renders an empty state since DD autosupport does not provide throughput history.
 */

import { EmptyState } from '@/components/ui/EmptyState';

/** Placeholder replication throughput chart — no throughput data available from autosupport. */
export function ReplicationChart() {
  return (
    <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <EmptyState
        title="No throughput data"
        message="DD autosupport does not provide replication throughput history"
      />
    </div>
  );
}
