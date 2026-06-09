'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { OtpInput }            from '@/components/auth/OtpInput'
import { OtpSuccessAnimation } from '@/components/auth/OtpSuccessAnimation'

const EMPTY  = ['', '', '', '', '', '']
const RESEND_COOLDOWN = 60

const ORB_CONFIG = [
  { w: 400, h: 400, top: '-10%', left: '-15%', from: '#AADD00', dur: 12 },
  { w: 320, h: 320, top: '60%',  left: '65%',  from: '#2979FF', dur: 16 },
  { w: 260, h: 260, top: '30%',  left: '40%',  from: '#AADD00', dur: 10 },
]

export default function TwoFaPage() {
  const [digits,    setDigits]    = useState<string[]>([...EMPTY])
  const [error,     setError]     = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [success,   setSuccess]   = useState(false)
  const [cooldown,  setCooldown]  = useState(0)
  const [allFilled, setAllFilled] = useState(false)
  const shakeControls = useAnimationControls()
  const router = useRouter()

  const sendCode = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/2fa/send', { method: 'POST' })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? 'Failed to send code')
        return
      }
      setCooldown(RESEND_COOLDOWN)
    } catch {
      setError('Network error — please try again.')
    }
  }, [])

  useEffect(() => { sendCode() }, [sendCode])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  function handleDigitsChange(next: string[]) {
    setDigits(next)
    setAllFilled(next.every(d => d !== ''))
  }

  async function handleVerify() {
    if (verifying || success) return
    const code = digits.join('')
    if (code.length !== 6) return

    setError(null)
    setVerifying(true)

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }

      if (!res.ok || !data.ok) {
        await shakeControls.start({
          x: [0, -10, 10, -8, 8, -5, 5, 0],
          transition: { duration: 0.5 },
        })
        setError(data.error ?? 'Verification failed')
        setDigits([...EMPTY])
        setAllFilled(false)
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/'), 1800)
    } catch {
      setError('Network error — please try again.')
      setDigits([...EMPTY])
      setAllFilled(false)
    } finally {
      setVerifying(false)
    }
  }

  // Auto-verify when all 6 digits are filled
  useEffect(() => {
    if (allFilled && !verifying && !success) {
      void handleVerify()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFilled])

  return (
    <div className="relative flex items-center justify-center" style={{ minHeight: 480 }}>
      {/* Floating orbs */}
      {ORB_CONFIG.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width:    orb.w,
            height:   orb.h,
            top:      orb.top,
            left:     orb.left,
            background: `radial-gradient(circle, ${orb.from}18 0%, transparent 70%)`,
            filter:   'blur(48px)',
          }}
          animate={{ x: [0, 24, -12, 18, 0], y: [0, -18, 14, -8, 0] }}
          transition={{ duration: orb.dur, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        />
      ))}

      {/* Card */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-7 px-8 py-9 rounded-3xl"
        style={{
          width:          360,
          background:     'rgba(20,20,25,0.75)',
          border:         '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          boxShadow:      '0 24px 60px rgba(0,0,0,0.55)',
        }}
        initial={{ opacity: 0, y: 28, scale: 0.95 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        transition={{ duration: 0.7, ease: 'easeInOut' }}
      >
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1    }}
              exit={{    opacity: 0               }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <OtpSuccessAnimation />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              className="flex flex-col items-center gap-6 w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{    opacity: 0 }}
            >
              {/* Badge */}
              <motion.div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(170,221,0,0.12)',
                  border:     '1px solid rgba(170,221,0,0.25)',
                }}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0  }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                <span
                  className="text-xs font-bold tracking-widest"
                  style={{ color: '#AADD00', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  DD Monitor
                </span>
              </motion.div>

              {/* Heading */}
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
              >
                <h2
                  className="text-xl font-semibold"
                  style={{ color: '#F0F0F5', fontFamily: 'Inter, sans-serif' }}
                >
                  Two-Factor Authentication
                </h2>
                <p
                  className="text-sm mt-1.5"
                  style={{ color: '#6B6B80', fontFamily: 'Inter, sans-serif' }}
                >
                  Enter the 6-digit code sent to your email
                </p>
              </motion.div>

              {/* OTP boxes with shake wrapper */}
              <motion.div animate={shakeControls}>
                <OtpInput value={digits} onChange={handleDigitsChange} disabled={verifying} />
              </motion.div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    className="text-sm text-center -mt-2"
                    style={{ color: '#FF4444', fontFamily: 'Inter, sans-serif' }}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1,  y: 0  }}
                    exit={{    opacity: 0          }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Verify button — appears when all 6 digits filled */}
              <AnimatePresence>
                {allFilled && (
                  <motion.button
                    onClick={handleVerify}
                    disabled={verifying}
                    className="w-full h-11 rounded-xl text-sm font-bold disabled:opacity-60"
                    style={{
                      background: '#AADD00',
                      color:      '#0A0A0F',
                      border:     'none',
                      fontFamily: 'Inter, sans-serif',
                    }}
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1    }}
                    exit={{    opacity: 0, y: 6               }}
                    transition={{ duration: 0.25 }}
                    whileHover={{ scale: verifying ? 1 : 1.02 }}
                    whileTap={{ scale: verifying ? 1 : 0.98 }}
                  >
                    {verifying ? 'Verifying…' : 'Verify Code'}
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Resend */}
              <motion.div
                className="flex items-center gap-2 text-sm"
                style={{ color: '#6B6B80' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <span>Didn&apos;t receive it?</span>
                <motion.button
                  onClick={() => { setError(null); sendCode() }}
                  disabled={cooldown > 0}
                  className="font-medium"
                  style={{ color: cooldown > 0 ? '#6B6B80' : '#F0F0F5', background: 'none', border: 'none' }}
                  whileHover={{ opacity: cooldown > 0 ? 0.4 : 0.8 }}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'}
                </motion.button>
              </motion.div>

              <a
                href="/login"
                className="text-xs"
                style={{ color: '#6B6B80' }}
                onMouseOver={e => (e.currentTarget.style.color = '#F0F0F5')}
                onMouseOut={e  => (e.currentTarget.style.color = '#6B6B80')}
              >
                ← Back to sign in
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
