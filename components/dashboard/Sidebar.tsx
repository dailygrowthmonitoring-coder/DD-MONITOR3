'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Bell,
  TrendingUp,
  Columns2,
  Activity,
  FileText,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface NavItem {
  href: string
  icon: React.ElementType
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',        icon: LayoutDashboard, label: 'Overview'      },
  { href: '/alerts',  icon: Bell,            label: 'Alerts'        },
  { href: '/history', icon: TrendingUp,      label: 'History'       },
  { href: '/compare', icon: Columns2,        label: 'Compare'       },
  { href: '/system',  icon: Activity,        label: 'System Health' },
  { href: '/logs',    icon: FileText,        label: 'Logs'          },
  { href: '/export',  icon: Download,        label: 'Export'        },
]

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: '/settings', icon: Settings, label: 'Settings' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={`flex flex-col bg-app-card border-r border-app-border transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-3 border-b border-app-border flex-shrink-0">
        <span
          className="font-bold text-accent tracking-widest text-sm whitespace-nowrap overflow-hidden transition-all duration-200"
          style={{ maxWidth: collapsed ? '0' : '120px', opacity: collapsed ? 0 : 1 }}
        >
          DD Monitor
        </span>
        {collapsed && (
          <span className="font-bold text-accent text-sm tracking-widest w-full text-center">
            DD
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-hidden" aria-label="Main navigation">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 mx-2 px-2 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-txt-muted hover:bg-app-bg hover:text-txt-primary'
              }`}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom nav — Settings + divider */}
      <div className="border-t border-app-border py-2 flex-shrink-0">
        {BOTTOM_NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 mx-2 px-2 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-txt-muted hover:bg-app-bg hover:text-txt-primary'
              }`}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </div>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-app-border flex-shrink-0">
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full py-1.5 rounded-md text-txt-muted hover:text-txt-primary hover:bg-app-bg transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          ) : (
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </aside>
  )
}
