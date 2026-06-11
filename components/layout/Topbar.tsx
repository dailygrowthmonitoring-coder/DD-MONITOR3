'use client';

/**
 * Topbar — sticky breadcrumb + search + live indicator + clock + bell.
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SlidersHorizontal, Bell } from 'lucide-react';

const PAGE_LABELS: Record<string, string> = {
  '/':           'overview',
  '/domains':    'domains',
  '/alerts':     'alerts',
  '/storage':    'storage',
  '/backup':     'backup',
  '/replication':'replication',
  '/reports':    'reports',
  '/settings':   'settings',
  '/system':     'system',
  '/logs':       'logs',
  '/compare':    'compare',
  '/export':     'export',
};

/** Sticky top bar with breadcrumb, search, live status, and clock. */
export function Topbar({ hasAlerts = false }: { readonly hasAlerts?: boolean }) {
  const pathname = usePathname();
  const [time, setTime] = useState('');

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const pageLabel = pathname.startsWith('/devices/')
    ? 'device'
    : Object.entries(PAGE_LABELS).find(([k]) => k !== '/' && pathname.startsWith(k))?.[1]
    ?? (pathname === '/' ? 'overview' : pathname.split('/')[1] ?? 'overview');

  return (
    <div className="topbar">
      <div className="topbar-bc">
        <span>dd / </span>
        <span style={{ color: 'var(--text2)' }}>{pageLabel}</span>
      </div>

      <input
        className="topbar-search"
        placeholder="Search…"
        type="search"
        aria-label="Search"
        readOnly
      />

      <div className="topbar-live">
        <span
          className="dot ok"
          style={{ width: 7, height: 7, display: 'inline-block' }}
        />
        live
      </div>

      <button className="topbar-icon-btn" aria-label="Sort" type="button">
        <SlidersHorizontal size={14} />
      </button>

      <button className="topbar-icon-btn" aria-label="Notifications" type="button">
        <Bell size={14} />
        {hasAlerts && <span className="topbar-bell-dot" />}
      </button>

      <div className="topbar-clock">{time}</div>
    </div>
  );
}
