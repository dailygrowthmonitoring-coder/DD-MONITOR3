'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';

export default function LoginPage() {
  const router = useRouter();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const supabase = createBrowserClient<Database>(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div className="auth-card">
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          display:        'inline-flex',
          alignItems:     'center',
          justifyContent: 'center',
          width:          44,
          height:         44,
          borderRadius:   8,
          background:     'var(--accent)',
          marginBottom:   12,
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="2" y="2" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.9" />
            <rect x="12" y="2" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.6" />
            <rect x="2" y="12" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.6" />
            <rect x="12" y="12" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.4" />
          </svg>
        </div>
        <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>
          NOVIX SYSTEMS
        </div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
          DD Monitor
        </h1>
        <div style={{ marginTop: 4, fontSize: 13, color: 'var(--sub)' }}>
          Sign in to your account
        </div>
      </div>

      {/* Form */}
      <form onSubmit={e => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && (
          <div className="auth-error">{error}</div>
        )}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="btn p"
          disabled={loading || !email || !password}
          style={{ marginTop: 4, width: '100%', justifyContent: 'center', height: 40 }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="spinner sm" />
              Signing in…
            </span>
          ) : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
