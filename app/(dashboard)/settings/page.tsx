'use client'

import { useState } from 'react'
import { useProfile } from '@/lib/hooks/use-profile'
import { SkeletonText } from '@/components/ui/SkeletonCard'
import ProfileTab from '@/components/settings/ProfileTab'
import UsersTab from '@/components/settings/UsersTab'
import SystemTab from '@/components/settings/SystemTab'

type Tab = 'profile' | 'users' | 'system'

export default function SettingsPage() {
  const { profile, isLoading } = useProfile()
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  const isAdmin = profile?.role === 'admin'

  const tabs: Array<{ id: Tab; label: string; adminOnly: boolean }> = [
    { id: 'profile', label: 'Profile',  adminOnly: false },
    { id: 'users',   label: 'Users',    adminOnly: true  },
    { id: 'system',  label: 'System',   adminOnly: true  },
  ]

  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-txt-primary">Settings</h1>
        {isLoading ? (
          <SkeletonText className="w-40 h-4" />
        ) : (
          <p className="text-sm text-txt-muted">
            {profile?.email ?? ''}
            {isAdmin && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-accent/20 text-accent font-semibold">
                Admin
              </span>
            )}
          </p>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-app-border">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-txt-muted hover:text-txt-primary',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'users'   && isAdmin && <UsersTab />}
        {activeTab === 'system'  && isAdmin && <SystemTab />}
      </div>
    </div>
  )
}
