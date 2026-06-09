'use client'
import { motion } from 'framer-motion'

const RING_SIZES = [160, 220, 280]

export function LoginBranding() {
  return (
    <motion.div
      className="relative flex flex-col items-center justify-center h-full select-none overflow-hidden"
      style={{ background: '#0D0D14', borderRadius: '12px 0 0 12px' }}
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      {/* Orbit rings */}
      {RING_SIZES.map((size, i) => (
        <motion.div
          key={size}
          className="absolute rounded-full border"
          style={{
            width: size,
            height: size,
            borderColor: `rgba(170,221,0,${0.08 - i * 0.02})`,
          }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{
            duration: 18 + i * 8,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: 6,
              height: 6,
              top: -3,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#AADD00',
              boxShadow: '0 0 8px #AADD00',
            }}
          />
        </motion.div>
      ))}

      {/* Center logo + text */}
      <div className="relative z-10 flex flex-col items-center gap-5">
        <motion.div
          className="flex items-center justify-center rounded-2xl"
          style={{
            width: 64,
            height: 64,
            background: 'rgba(170,221,0,0.12)',
            border: '1.5px solid rgba(170,221,0,0.3)',
            boxShadow: '0 0 32px rgba(170,221,0,0.2)',
          }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6, ease: 'easeInOut' }}
        >
          <span
            className="font-bold tracking-widest"
            style={{ color: '#AADD00', fontSize: 22, fontFamily: 'JetBrains Mono, monospace' }}
          >
            DD
          </span>
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <p
            className="text-xl font-semibold"
            style={{ color: '#F0F0F5', fontFamily: 'Inter, sans-serif' }}
          >
            DD Monitor
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: '#6B6B80', letterSpacing: '0.1em' }}
          >
            ENTERPRISE BACKUP INTELLIGENCE
          </p>
        </motion.div>
      </div>

      {/* Bottom tagline */}
      <motion.p
        className="absolute bottom-8 text-xs text-center px-6"
        style={{ color: '#6B6B80', fontFamily: 'Inter, sans-serif' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
      >
        Dell Data Domain DD6300 — Real-time monitoring
      </motion.p>
    </motion.div>
  )
}
