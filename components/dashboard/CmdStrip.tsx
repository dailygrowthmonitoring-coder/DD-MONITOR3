interface CmdStripProps {
  connected?: boolean
}

export function CmdStrip({ connected = true }: CmdStripProps) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 'var(--r)',
      padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
      margin: '0 24px 16px', fontFamily: 'var(--font-geist-mono),monospace', fontSize: 11.5, color: 'var(--muted)',
    }}>
      <span style={{ color: 'var(--accent2)' }}>$</span>
      <span style={{ color: 'var(--sub)' }}>dd-monitor --status all --format compact --refresh 60s</span>
      <span className="anim-blink" style={{ display: 'inline-block', width: 7, height: 13, background: 'var(--accent2)', opacity: .9, borderRadius: 1, marginLeft: 2 }} />
      {connected && (
        <span style={{ marginLeft: 'auto', color: 'var(--green)', fontSize: 10 }}>
          ✓ connected · sftp.corp.internal
        </span>
      )}
    </div>
  )
}
