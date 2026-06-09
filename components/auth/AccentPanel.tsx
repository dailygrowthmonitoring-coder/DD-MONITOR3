'use client'
import { motion, AnimatePresence } from 'framer-motion'

interface AccentPanelProps {
  mode:     'signin' | 'signup'
  onSwitch: () => void
}

const CONTENT = {
  signin: {
    title:    'Hello, Friend!',
    subtitle: 'Monitor your Dell Data Domain devices',
    button:   'Sign Up',
  },
  signup: {
    title:    'Welcome Back!',
    subtitle: 'Sign in to access your monitoring dashboard',
    button:   'Sign In',
  },
}

export function AccentPanel({ mode, onSwitch }: AccentPanelProps) {
  const content = CONTENT[mode]

  return (
    <div
      className="relative flex flex-col items-center justify-center h-full px-10 select-none overflow-hidden"
      style={{ background: '#AADD00' }}
    >
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.18) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        {/* Logo badge */}
        <div
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: 'rgba(10,10,15,0.12)',
            border: '1.5px solid rgba(10,10,15,0.18)',
          }}
        >
          <span
            className="font-bold tracking-widest text-sm"
            style={{ color: '#0A0A0F', fontFamily: 'JetBrains Mono, monospace' }}
          >
            DD Monitor
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <h2
              className="text-3xl font-bold"
              style={{ color: '#0A0A0F', fontFamily: 'Inter, sans-serif' }}
            >
              {content.title}
            </h2>
            <p
              className="text-sm max-w-xs leading-relaxed"
              style={{ color: 'rgba(10,10,15,0.65)', fontFamily: 'Inter, sans-serif' }}
            >
              {content.subtitle}
            </p>

            <motion.button
              onClick={onSwitch}
              className="mt-2 px-8 py-2.5 rounded-full text-sm font-semibold transition-colors"
              style={{
                background: 'transparent',
                border: '2px solid rgba(10,10,15,0.55)',
                color: '#0A0A0F',
                fontFamily: 'Inter, sans-serif',
              }}
              whileHover={{ scale: 1.03, borderColor: '#0A0A0F' }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
            >
              {content.button}
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
