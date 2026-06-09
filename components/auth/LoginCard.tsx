'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { AccentPanel } from './AccentPanel'
import { SignInPanel } from './SignInPanel'
import { SignUpPanel } from './SignUpPanel'

const CARD_W    = 850
const CARD_H    = 500
const PANEL_W   = CARD_W / 2  // 425

type Mode = 'signin' | 'signup'

export function LoginCard() {
  const [mode, setMode] = useState<Mode>('signin')
  const isSignIn = mode === 'signin'

  return (
    <div
      style={{
        width:        CARD_W,
        height:       CARD_H,
        position:     'relative',
        overflow:     'hidden',
        borderRadius: 24,
        boxShadow:    '0 32px 80px rgba(0,0,0,0.55)',
      }}
    >
      {/* White background fills the whole card */}
      <div
        style={{
          position:   'absolute',
          inset:      0,
          background: '#ffffff',
        }}
      />

      {/* Sign-in form — always occupies left slot */}
      <div
        style={{
          position: 'absolute',
          top:      0,
          left:     0,
          width:    PANEL_W,
          height:   CARD_H,
        }}
      >
        <SignInPanel visible={isSignIn} />
      </div>

      {/* Sign-up form — always occupies right slot */}
      <div
        style={{
          position: 'absolute',
          top:      0,
          right:    0,
          width:    PANEL_W,
          height:   CARD_H,
        }}
      >
        <SignUpPanel visible={!isSignIn} />
      </div>

      {/* Accent panel — slides horizontally over the white background */}
      <motion.div
        style={{
          position:     'absolute',
          top:          0,
          width:        PANEL_W,
          height:       CARD_H,
          borderRadius: 24,
          zIndex:       10,
          overflow:     'hidden',
        }}
        animate={{ left: isSignIn ? PANEL_W : 0 }}
        transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
      >
        <AccentPanel mode={mode} onSwitch={() => setMode(isSignIn ? 'signup' : 'signin')} />
      </motion.div>
    </div>
  )
}
