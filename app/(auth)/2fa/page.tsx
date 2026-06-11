'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';

const DIGITS = 6;

export default function TwoFactorPage() {
  const router = useRouter();

  const [digits, setDigits]   = useState<string[]>(Array(DIGITS).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const inputs                = useRef<(HTMLInputElement | null)[]>([]);

  const supabase = createBrowserClient<Database>(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
  );

  function handleChange(idx: number, val: string) {
    const char = val.replace(/\D/g, '').slice(-1);
    const next  = [...digits];
    next[idx]   = char;
    setDigits(next);

    if (char && idx < DIGITS - 1) {
      inputs.current[idx + 1]?.focus();
    }

    if (char && idx === DIGITS - 1 && next.every(d => d !== '')) {
      void verify(next.join(''));
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0)       inputs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < DIGITS - 1) inputs.current[idx + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS);
    if (text.length === DIGITS) {
      e.preventDefault();
      const next = text.split('');
      setDigits(next);
      inputs.current[DIGITS - 1]?.focus();
      void verify(text);
    }
  }

  async function verify(code: string) {
    setLoading(true);
    setError(null);

    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const totp = factorsData?.totp?.[0];

    if (!totp) {
      setError('No TOTP factor enrolled. Contact your administrator.');
      setLoading(false);
      return;
    }

    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
    if (challengeErr || !challenge) {
      setError(challengeErr?.message ?? 'Failed to create challenge');
      setLoading(false);
      return;
    }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId:    totp.id,
      challengeId: challenge.id,
      code,
    });

    if (verifyErr) {
      setError('Invalid code. Try again.');
      setDigits(Array(DIGITS).fill(''));
      inputs.current[0]?.focus();
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  const fullCode = digits.join('');
  const canSubmit = fullCode.length === DIGITS && !loading;

  return (
    <div className="auth-card">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
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
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V6a4 4 0 0 0-4-4zm0 2a2 2 0 0 1 2 2v2H8V6a2 2 0 0 1 2-2zm0 8a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" fill="white" fillOpacity="0.9" />
          </svg>
        </div>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
          Two-factor authentication
        </h1>
        <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--sub)', maxWidth: 260, margin: '6px auto 0' }}>
          Enter the 6-digit code from your authenticator app
        </div>
      </div>

      {error && (
        <div className="auth-error" style={{ marginBottom: 14 }}>{error}</div>
      )}

      {/* OTP inputs */}
      <div
        className="otp-row"
        onPaste={handlePaste}
        style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            disabled={loading}
            style={{
              width:       44,
              height:      52,
              textAlign:   'center',
              fontFamily:  'var(--font-geist-mono)',
              fontSize:    22,
              fontWeight:  700,
              background:  'var(--bg3)',
              border:      `1px solid ${d ? 'var(--accent)' : 'var(--line)'}`,
              borderRadius:'var(--r)',
              color:       'var(--text)',
              outline:     'none',
              caretColor:  'transparent',
              transition:  'border-color 0.1s',
            }}
          />
        ))}
      </div>

      <button
        type="button"
        className="btn p"
        disabled={!canSubmit}
        onClick={() => void verify(fullCode)}
        style={{ width: '100%', justifyContent: 'center', height: 40 }}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="spinner sm" />
            Verifying…
          </span>
        ) : 'Verify'}
      </button>

      <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11.5, color: 'var(--muted)' }}>
        Having trouble?{' '}
        <a href="/login" style={{ color: 'var(--accent2)', textDecoration: 'none' }}>
          Back to sign in
        </a>
      </div>
    </div>
  );
}
