interface StatCardProps {
  label:    string
  value:    React.ReactNode
  sub?:     string
  tag?:     string
  tagType?: 'up' | 'dn' | 'nu'
}

const TAG_STYLES: Record<string, React.CSSProperties> = {
  up: { background: 'var(--green-bg)',  color: 'var(--green)' },
  dn: { background: 'var(--red-bg)',    color: 'var(--red)' },
  nu: { background: 'var(--bg3)',       color: 'var(--muted)' },
}

export function StatCard({ label, value, sub, tag, tagType = 'nu' }: StatCardProps) {
  return (
    <div style={{ padding: '16px 18px', borderRight: '1px solid var(--line)', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg,transparent,var(--line2),transparent)',
      }} />
      <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-geist-mono),monospace', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-geist-mono),monospace', lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 6, fontFamily: 'var(--font-geist-mono),monospace' }}>
          {sub}
        </div>
      )}
      {tag && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontFamily: 'var(--font-geist-mono),monospace', padding: '2px 6px', borderRadius: 2, marginTop: 6, fontWeight: 500, ...TAG_STYLES[tagType] }}>
          {tag}
        </div>
      )}
    </div>
  )
}
