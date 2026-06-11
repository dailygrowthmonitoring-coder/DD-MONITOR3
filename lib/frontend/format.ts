/**
 * lib/frontend/format.ts
 *
 * Client-safe formatting utilities for the DD Monitor dashboard.
 * No server-only imports. Pure functions only.
 */

// ---------------------------------------------------------------------------
// Storage formatting
// ---------------------------------------------------------------------------

/**
 * Formats a GiB value as a human-readable string with appropriate unit.
 * Mirrors Gib.toHumanString() but operates on plain numbers.
 */
export function formatGib(gib: number): string {
  if (gib >= 1_048_576) {
    return `${(gib / 1_048_576).toFixed(2)} PiB`;
  }
  if (gib >= 1024) {
    return `${(gib / 1024).toFixed(2)} TiB`;
  }
  return `${gib.toFixed(2)} GiB`;
}

/** Formats a percent value to one decimal place with % suffix. */
export function formatPercent(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

/** Formats a compression factor, e.g. 22.4 → "22.4x". */
export function formatFactor(factor: number): string {
  return `${factor.toFixed(1)}x`;
}

// ---------------------------------------------------------------------------
// Date / time formatting
// ---------------------------------------------------------------------------

/** Formats an ISO date string as "Jun 10, 2026". */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Formats an ISO date string as "Jun 10". */
export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Formats an ISO timestamp as a relative string: "2m ago", "3h ago", "5d ago". */
export function formatRelative(iso: string): string {
  const now   = Date.now();
  const then  = new Date(iso).getTime();
  const diffMs = now - then;

  const diffSec  = Math.floor(diffMs / 1000);
  const diffMin  = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay  = Math.floor(diffMs / 86_400_000);

  if (diffSec < 60)   return `${diffSec}s ago`;
  if (diffMin < 60)   return `${diffMin}m ago`;
  if (diffHour < 24)  return `${diffHour}h ago`;
  if (diffDay < 30)   return `${diffDay}d ago`;
  return formatDate(iso);
}

/** Formats runway days as months, e.g. 180 → "~6.0 months". */
export function formatRunway(days: number | null): string {
  if (days === null) return '—';
  if (days <= 0)     return 'Full';
  const months = days / 30;
  return `~${months.toFixed(1)} mo`;
}

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

/** Device / report status string → CSS class suffix (ok | wa | cr | gr). */
export function statusToClass(status: string): 'ok' | 'wa' | 'cr' | 'gr' {
  switch (status) {
    case 'healthy':  return 'ok';
    case 'warning':  return 'wa';
    case 'critical': return 'cr';
    default:         return 'gr';
  }
}

/** Alert severity → CSS class suffix (cr | wa | in | ok). */
export function severityToClass(sev: string): 'cr' | 'wa' | 'in' | 'ok' {
  switch (sev) {
    case 'CRITICAL': return 'cr';
    case 'WARNING':  return 'wa';
    case 'INFO':     return 'in';
    default:         return 'ok';
  }
}

/** Storage percent → CSS class based on warning/critical thresholds. */
export function percentToClass(pct: number): 'ok' | 'wa' | 'cr' {
  if (pct >= 95) return 'cr';
  if (pct >= 90) return 'wa';
  return 'ok';
}

/** Returns the CSS color variable for a status string. */
export function statusToColor(status: string): string {
  switch (status) {
    case 'healthy':  return 'var(--green)';
    case 'warning':  return 'var(--amber)';
    case 'critical': return 'var(--red)';
    default:         return 'var(--muted)';
  }
}

/** Returns a CSS color variable for a severity string. */
export function severityToColor(sev: string): string {
  switch (sev) {
    case 'CRITICAL': return 'var(--red)';
    case 'WARNING':  return 'var(--amber)';
    case 'INFO':     return 'var(--blue)';
    default:         return 'var(--muted)';
  }
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

/** Truncates a string to maxLen chars with ellipsis. */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.substring(0, maxLen)}…`;
}

/** Returns today's date as ISO date string in local timezone, e.g. "2026-06-11". */
export function todayIso(): string {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = String(now.getMonth() + 1).padStart(2, '0');
  const d   = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Formats bytes to a human-readable string. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1e9)  return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6)  return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3)  return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}
