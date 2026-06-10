interface OverviewHeaderProps {
  deviceCount: number
  lastRefresh: string
}

export function OverviewHeader({ deviceCount, lastRefresh }: OverviewHeaderProps) {
  return (
    <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.5px', color: 'var(--text)' }}>Overview</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', marginTop: 3 }}>
          {deviceCount} domain{deviceCount !== 1 ? 's' : ''} · ingestion active · {lastRefresh}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 'var(--r)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--bg2)', color: 'var(--sub)' }}>
          Export
        </button>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 'var(--r)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' }}>
          + Add Domain
        </button>
      </div>
    </div>
  )
}
