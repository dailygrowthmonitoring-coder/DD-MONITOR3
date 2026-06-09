'use client'
import { Bell, Sun, Moon, User } from 'lucide-react'

interface NavbarProps {
  isDark: boolean
  onToggleTheme: () => void
}

export function Navbar({ isDark, onToggleTheme }: NavbarProps) {
  return (
    <header className="flex items-center justify-between h-14 px-6 bg-app-card border-b border-app-border flex-shrink-0">
      <span className="font-bold text-accent tracking-widest text-sm">DD Monitor</span>

      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-md text-txt-muted hover:text-txt-primary hover:bg-app-bg transition-colors"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <Sun className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Moon className="w-4 h-4" aria-hidden="true" />
          )}
        </button>

        {/* Notification bell */}
        <button
          className="p-2 rounded-md text-txt-muted hover:text-txt-primary hover:bg-app-bg transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* User avatar */}
        <button
          className="ml-1 flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 text-accent text-xs font-bold hover:bg-accent/30 transition-colors"
          aria-label="User menu"
        >
          <User className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
