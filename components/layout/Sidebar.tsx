'use client';

/**
 * Sidebar — fixed left navigation, live device status list, user footer.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Globe,
  Bell,
  HardDrive,
  ShieldCheck,
  GitBranch,
  FileText,
  Settings,
  Activity,
  ScrollText,
  GitCompare,
  Download,
} from 'lucide-react';
import { StatusDot } from '@/components/ui/StatusDot';
import type { DeviceDTO } from '@/lib/frontend/api';

interface NavItem {
  readonly href:  string;
  readonly label: string;
  readonly icon:  React.ReactNode;
  readonly badge?: number;
}

interface SidebarProps {
  readonly devices:      DeviceDTO[];
  readonly alertCount:   number;
  readonly reportCount?: number;
  readonly userName?:    string;
  readonly userRole?:    string;
}

const NAV_GROUP1: NavItem[] = [
  { href: '/',        label: 'Overview',   icon: <LayoutDashboard size={14} /> },
  { href: '/domains', label: 'Domains',    icon: <Globe size={14} /> },
  { href: '/alerts',  label: 'Alerts',     icon: <Bell size={14} /> },
];

const NAV_GROUP2: NavItem[] = [
  { href: '/storage',     label: 'Storage',      icon: <HardDrive size={14} /> },
  { href: '/backup',      label: 'Backup Health', icon: <ShieldCheck size={14} /> },
  { href: '/replication', label: 'Replication',   icon: <GitBranch size={14} /> },
];

const NAV_GROUP3: NavItem[] = [
  { href: '/reports',  label: 'Reports',  icon: <FileText size={14} /> },
  { href: '/settings', label: 'Settings', icon: <Settings size={14} /> },
];

const NAV_SYSTEM: NavItem[] = [
  { href: '/system',  label: 'System Health', icon: <Activity size={14} /> },
  { href: '/logs',    label: 'Logs',          icon: <ScrollText size={14} /> },
  { href: '/compare', label: 'Compare',       icon: <GitCompare size={14} /> },
  { href: '/export',  label: 'Export',        icon: <Download size={14} /> },
];

/** Renders the fixed left sidebar with navigation and live device status. */
export function Sidebar({
  devices,
  alertCount,
  reportCount,
  userName = 'Admin',
  userRole = 'sysadmin',
}: SidebarProps) {
  const pathname = usePathname();

  const initials = userName
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .substring(0, 2);

  function NavLink({ item, badge }: { item: NavItem; badge?: number }) {
    const isActive = item.href === '/'
      ? pathname === '/'
      : pathname.startsWith(item.href);

    return (
      <Link
        href={item.href}
        className={`sb-item${isActive ? ' active' : ''}`}
      >
        <span className="sb-item-icon">{item.icon}</span>
        {item.label}
        {badge !== undefined && badge > 0 && (
          <span className="sb-item-badge">{badge}</span>
        )}
      </Link>
    );
  }

  return (
    <div className="sb">
      {/* Logo */}
      <div className="sb-logo">
        <div className="sb-logo-icon">DD</div>
        <div className="sb-logo-text">
          <div className="sb-logo-name">DD Monitor</div>
          <div className="sb-logo-env">monitor/prod</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sb-nav">
        {NAV_GROUP1.map(item => (
          <NavLink
            key={item.href}
            item={item}
            {...(item.href === '/alerts' && alertCount !== undefined ? { badge: alertCount } : {})}
          />
        ))}

        <div className="sb-group-label">Analysis</div>
        {NAV_GROUP2.map(item => (
          <NavLink key={item.href} item={item} />
        ))}

        <div className="sb-group-label">System</div>
        {NAV_GROUP3.map(item => (
          <NavLink
            key={item.href}
            item={item}
            {...(item.href === '/reports' && reportCount !== undefined ? { badge: reportCount } : {})}
          />
        ))}
        {NAV_SYSTEM.map(item => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Live device status */}
      {devices.length > 0 && (
        <div className="sb-domains">
          <div className="sb-domains-label">Live Status</div>
          {devices.map(d => (
            <div key={d.id} className="sb-domain-row">
              <StatusDot status={d.lastStatus} />
              <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: 11 }}>
                {d.shortName}
              </span>
              <span className="sb-domain-pct">
                {d.lastUsedPercent !== null ? `${d.lastUsedPercent.toFixed(0)}%` : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* User footer */}
      <div className="sb-footer">
        <div className="sb-avatar">{initials}</div>
        <div>
          <div className="sb-user-name">{userName}</div>
          <div className="sb-user-role">{userRole}</div>
        </div>
      </div>
    </div>
  );
}
