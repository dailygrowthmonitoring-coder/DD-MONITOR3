export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display:        'flex',
        minHeight:      '100dvh',
        background:     'var(--color-bg)',
        alignItems:     'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  );
}
