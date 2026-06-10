'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

const PATH_LABELS: Record<string, string> = {
  '/':          'overview',
  '/devices':   'domains',
  '/alerts':    'alerts',
  '/history':   'storage',
  '/compare':   'backup',
  '/system':    'replication',
  '/logs':      'reports',
  '/settings':  'settings',
  '/export':    'export',
}

function getPageLabel(pathname: string): string {
  if (PATH_LABELS[pathname]) return PATH_LABELS[pathname]
  const match = Object.entries(PATH_LABELS).find(([k]) => k !== '/' && pathname.startsWith(k))
  return match ? match[1] : 'overview'
}

export function Navbar() {
  const pathname  = usePathname()
  const pageLabel = getPageLabel(pathname)
  const [clock, setClock] = useState('')

  useEffect(() => {
    function tick() {
      setClock(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header style={{
      height: 'var(--th)', background: 'var(--bg)', borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10,
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 11.5, color: 'var(--sub)', flex: 1, fontFamily: 'var(--font-geist-mono),monospace' }}>
        dd / <span style={{ color: 'var(--text2)' }}>{pageLabel}</span>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 'var(--r)',
        padding: '4px 10px', width: 190,
      }}>
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="var(--muted)" strokeWidth="2">
          <circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="15" y2="15"/>
        </svg>
        <input
          placeholder="Search…"
          type="text"
          style={{ border: 'none', background: 'none', outline: 'none', fontSize: 11.5, color: 'var(--text)', fontFamily: 'var(--font-geist),sans-serif', width: '100%' }}
          aria-label="Search"
        />
        <span style={{ fontSize: 9.5, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: 2, padding: '1px 4px', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          ⌘K
        </span>
      </div>

      {/* Live indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--sub)', fontFamily: 'var(--font-geist-mono),monospace', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '3px 8px' }}>
        <span className="anim-live" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
        live
      </div>

      {/* Sort button */}
      <button aria-label="Sort" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'transparent', color: 'var(--sub)', cursor: 'pointer' }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
          <polyline points="1,4 4,1 7,4"/><line x1="4" y1="1" x2="4" y2="10"/>
          <polyline points="9,12 12,15 15,12"/><line x1="12" y1="15" x2="12" y2="6"/>
        </svg>
      </button>

      {/* Bell */}
      <button aria-label="Notifications" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'transparent', color: 'var(--sub)', cursor: 'pointer', position: 'relative' }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 1.5a4.5 4.5 0 0 1 4.5 4.5v2l1 2H2.5l1-2V6A4.5 4.5 0 0 1 8 1.5z"/>
          <path d="M6.5 12.5a1.5 1.5 0 0 0 3 0"/>
        </svg>
        <span style={{ width: 5, height: 5, background: 'var(--red)', borderRadius: '50%', position: 'absolute', top: 5, right: 5, border: '1.5px solid var(--bg)' }} />
      </button>

      {/* Clock */}
      <div style={{ fontFamily: 'var(--font-geist-mono),monospace', fontSize: 11, color: 'var(--muted)' }}>
        {clock || '—'}
      </div>
    </header>
  )
}
