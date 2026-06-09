'use client'
import { useState, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const INPUT_BASE: React.CSSProperties = {
  height:       40,
  padding:      '0 12px',
  borderRadius: 10,
  border:       '1.5px solid #E5E7EB',
  background:   '#F9FAFB',
  color:        '#111118',
  fontSize:     14,
  fontFamily:   'Inter, sans-serif',
  width:        '100%',
  outline:      'none',
  transition:   'border-color 0.15s',
}

interface SignUpPanelProps {
  visible: boolean
}

export function SignUpPanel({ visible }: SignUpPanelProps) {
  const [toast, setToast] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setToast(true)
    setTimeout(() => setToast(false), 3000)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="signup"
          className="flex flex-col justify-center h-full px-10"
          style={{ background: '#ffffff', position: 'relative' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{    opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {/* Coming soon toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                className="absolute top-6 left-10 right-10 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold z-10"
                style={{ background: '#AADD00', color: '#0A0A0F' }}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{    opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <span>🚀</span>
                <span>Sign Up is coming soon — use admin credentials to sign in.</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.h2
            className="text-2xl font-bold mb-1"
            style={{ color: '#0A0A0F', fontFamily: 'Inter, sans-serif' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35 }}
          >
            Create Account
          </motion.h2>
          <motion.p
            className="text-sm mb-6"
            style={{ color: '#6B7280' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
          >
            Get started with DD Monitor
          </motion.p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {[
              { label: 'FULL NAME',  type: 'text',     placeholder: 'John Smith',        delay: 0.2  },
              { label: 'EMAIL',      type: 'email',    placeholder: 'you@example.com',   delay: 0.25 },
              { label: 'PASSWORD',   type: 'password', placeholder: '••••••••',          delay: 0.3  },
            ].map(({ label, type, placeholder, delay }) => (
              <motion.div
                key={label}
                className="flex flex-col gap-1.5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay, duration: 0.35 }}
              >
                <label className="text-xs font-semibold" style={{ color: '#374151' }}>{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  style={INPUT_BASE}
                  onFocus={e => (e.currentTarget.style.borderColor = '#AADD00')}
                  onBlur={e  => (e.currentTarget.style.borderColor = '#E5E7EB')}
                />
              </motion.div>
            ))}

            <motion.button
              type="submit"
              className="h-10 rounded-xl text-sm font-bold mt-1"
              style={{
                background: '#AADD00',
                color: '#0A0A0F',
                fontFamily: 'Inter, sans-serif',
                border: 'none',
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Sign Up
            </motion.button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
