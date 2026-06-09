'use client'
import { motion } from 'framer-motion'

export function OtpSuccessAnimation() {
  return (
    <motion.div
      className="flex flex-col items-center gap-6 py-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Checkmark with glow */}
      <div className="relative flex items-center justify-center">
        {/* Radial glow */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width:      120,
            height:     120,
            background: 'radial-gradient(circle, rgba(170,221,0,0.2) 0%, transparent 70%)',
            filter:     'blur(12px)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 2.2, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        <motion.svg
          width="80"
          height="80"
          viewBox="0 0 48 48"
          fill="none"
          className="relative z-10"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <motion.circle
            cx="24" cy="24" r="21"
            stroke="#AADD00"
            strokeWidth="2"
            fill="rgba(170,221,0,0.08)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.55, ease: 'easeInOut' }}
          />
          <motion.path
            d="M 14 25 L 21 33 L 34 16"
            stroke="#AADD00"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, delay: 0.45, ease: 'easeInOut' }}
          />
        </motion.svg>
      </div>

      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.4 }}
      >
        <p
          className="text-lg font-semibold"
          style={{ color: '#F0F0F5', fontFamily: 'Inter, sans-serif' }}
        >
          Verified Successfully
        </p>
        <p
          className="text-sm mt-1"
          style={{ color: '#6B6B80', fontFamily: 'Inter, sans-serif' }}
        >
          Redirecting to dashboard…
        </p>
      </motion.div>
    </motion.div>
  )
}
