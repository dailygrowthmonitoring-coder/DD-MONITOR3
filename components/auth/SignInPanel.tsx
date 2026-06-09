'use client'
import { useState, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const INPUT_BASE: React.CSSProperties = {
  height:     40,
  padding:    '0 12px',
  borderRadius: 10,
  border:     '1.5px solid #E5E7EB',
  background: '#F9FAFB',
  color:      '#111118',
  fontSize:   14,
  fontFamily: 'Inter, sans-serif',
  width:      '100%',
  outline:    'none',
  transition: 'border-color 0.15s',
}

interface SignInPanelProps {
  visible: boolean
}

export function SignInPanel({ visible }: SignInPanelProps) {
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [loading,     setLoading]     = useState(false)
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) { setError('Invalid email or password.'); return }
      router.push('/2fa')
    } catch {
      setError('Unexpected error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="signin"
          className="flex flex-col justify-center h-full px-10"
          style={{ background: '#ffffff' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{    opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <motion.h2
            className="text-2xl font-bold mb-1"
            style={{ color: '#0A0A0F', fontFamily: 'Inter, sans-serif' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35 }}
          >
            Sign In
          </motion.h2>
          <motion.p
            className="text-sm mb-6"
            style={{ color: '#6B7280' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
          >
            Welcome back — enter your credentials
          </motion.p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <motion.div
              className="flex flex-col gap-1.5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.35 }}
            >
              <label className="text-xs font-semibold" style={{ color: '#374151' }}>EMAIL</label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={INPUT_BASE}
                onFocus={e => (e.currentTarget.style.borderColor = '#AADD00')}
                onBlur={e  => (e.currentTarget.style.borderColor = '#E5E7EB')}
              />
            </motion.div>

            <motion.div
              className="flex flex-col gap-1.5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.35 }}
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold" style={{ color: '#374151' }}>PASSWORD</label>
                <button type="button" className="text-xs" style={{ color: '#6B7280' }}>
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} required autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...INPUT_BASE, paddingRight: 40 }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#AADD00')}
                  onBlur={e  => (e.currentTarget.style.borderColor = '#E5E7EB')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: '#9CA3AF' }}
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.p
                  className="text-sm"
                  style={{ color: '#FF4444' }}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1,  y: 0  }}
                  exit={{    opacity: 0          }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading}
              className="h-10 rounded-xl text-sm font-bold disabled:opacity-60"
              style={{
                background: '#AADD00',
                color: '#0A0A0F',
                fontFamily: 'Inter, sans-serif',
                border: 'none',
              }}
              whileHover={{ scale: loading ? 1 : 1.03 }}
              whileTap={{ scale: loading ? 1 : 0.97 }}
              transition={{ duration: 0.15 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </motion.button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
