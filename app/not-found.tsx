import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        minHeight:      '100dvh',
        gap:            '1.5rem',
        padding:        '2rem',
        fontFamily:     'var(--font-geist-sans), system-ui, sans-serif',
        background:     'var(--color-bg)',
        color:          'var(--color-text)',
      }}
    >
      <p
        style={{
          fontSize:    '5rem',
          fontWeight:  700,
          lineHeight:  1,
          color:       'var(--color-brand)',
          margin:      0,
        }}
      >
        404
      </p>
      <p style={{ fontSize: '1.125rem', color: 'var(--color-text-dim)', margin: 0 }}>
        Page not found.
      </p>
      <Link
        href="/"
        style={{
          marginTop:       '0.5rem',
          padding:         '0.5rem 1.25rem',
          background:      'var(--color-brand)',
          color:           '#fff',
          borderRadius:    'var(--radius-md)',
          textDecoration:  'none',
          fontSize:        '0.875rem',
          fontWeight:      500,
        }}
      >
        Back to dashboard
      </Link>
    </main>
  );
}
