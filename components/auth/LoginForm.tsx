'use client'
import { useState, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function LoginForm() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createBrowserSupabaseClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        setError('Invalid email or password.')
        return
      }

      router.push('/2fa')
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="flex flex-col justify-center h-full px-10"
      style={{ background: '#111118', borderRadius: '0 12px 12px 0' }}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <h2
          className="text-2xl font-semibold mb-1"
          style={{ color: '#F0F0F5', fontFamily: 'Inter, sans-serif' }}
        >
          Sign in
        </h2>
        <p className="text-sm mb-8" style={{ color: '#6B6B80' }}>
          Enter your credentials to continue
        </p>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.6 }}
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: '#6B6B80' }}>
            EMAIL
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-10 px-3 rounded-lg text-sm outline-none transition-all"
            style={{
              background: '#0A0A0F',
              border: '1px solid #1E1E2E',
              color: '#F0F0F5',
              fontFamily: 'Inter, sans-serif',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#AADD00')}
            onBlur={e  => (e.currentTarget.style.borderColor = '#1E1E2E')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: '#6B6B80' }}>
            PASSWORD
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-10 px-3 rounded-lg text-sm outline-none transition-all"
            style={{
              background: '#0A0A0F',
              border: '1px solid #1E1E2E',
              color: '#F0F0F5',
              fontFamily: 'Inter, sans-serif',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#AADD00')}
            onBlur={e  => (e.currentTarget.style.borderColor = '#1E1E2E')}
          />
        </div>

        {error && (
          <motion.p
            className="text-sm"
            style={{ color: '#FF4444' }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.p>
        )}

        <motion.button
          type="submit"
          disabled={loading}
          className="h-10 rounded-lg text-sm font-semibold mt-2 transition-all disabled:opacity-50"
          style={{
            background: loading ? 'rgba(170,221,0,0.7)' : '#AADD00',
            color: '#0A0A0F',
            fontFamily: 'Inter, sans-serif',
          }}
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
        >
          {loading ? 'Signing in…' : 'Continue →'}
        </motion.button>
      </motion.form>
    </motion.div>
  )
}
