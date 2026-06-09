'use client'
import { useRef, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react'
import { motion } from 'framer-motion'

interface OtpInputProps {
  value:    string[]
  onChange: (digits: string[]) => void
  disabled?: boolean
  focused?: boolean
}

const containerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const boxVariants = {
  hidden:  { opacity: 0, y: 10, scale: 0.85 },
  visible: { opacity: 1, y: 0,  scale: 1    },
}

const digitVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1,   opacity: 1 },
}

export function OtpInput({ value, onChange, disabled }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])

  function focus(i: number) {
    refs.current[i]?.focus()
  }

  function handleChange(i: number, e: ChangeEvent<HTMLInputElement>) {
    const digit = e.target.value.replace(/\D/g, '').slice(-1)
    if (!digit) return
    const next = [...value]
    next[i] = digit
    onChange(next)
    if (i < 5) focus(i + 1)
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = [...value]
      if (next[i]) {
        next[i] = ''
        onChange(next)
      } else if (i > 0) {
        next[i - 1] = ''
        onChange(next)
        focus(i - 1)
      }
    } else if (e.key === 'ArrowLeft' && i > 0)  { focus(i - 1) }
      else if (e.key === 'ArrowRight' && i < 5) { focus(i + 1) }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!digits) return
    const next = ['', '', '', '', '', '']
    for (let i = 0; i < digits.length; i++) next[i] = digits[i]
    onChange(next)
    focus(Math.min(digits.length, 5))
  }

  return (
    <motion.div
      className="flex gap-3"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {value.map((digit, i) => (
        <motion.div
          key={i}
          variants={boxVariants}
          transition={{ duration: 0.3 }}
          style={{ position: 'relative' }}
        >
          <input
            ref={el => { refs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={e => handleChange(i, e)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={e => {
              e.currentTarget.select()
              e.currentTarget.style.borderColor = '#AADD00'
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = digit
                ? 'rgba(170,221,0,0.6)'
                : 'rgba(255,255,255,0.12)'
              e.currentTarget.style.transform = 'scale(1)'
            }}
            className="text-center text-xl font-mono outline-none disabled:opacity-40"
            style={{
              width:        44,
              height:       52,
              borderRadius: 12,
              background:   'rgba(30,30,46,0.8)',
              border:       digit
                ? '2px solid rgba(170,221,0,0.6)'
                : '1.5px solid rgba(255,255,255,0.12)',
              color:        '#F0F0F5',
              caretColor:   '#AADD00',
              transition:   'border-color 0.15s, transform 0.15s',
              fontFamily:   'JetBrains Mono, monospace',
              boxShadow:    digit ? '0 0 10px rgba(170,221,0,0.15)' : 'none',
            }}
          />
          {/* Digit entry animation overlay (invisible, just triggers re-key) */}
          {digit && (
            <motion.span
              key={digit + i}
              variants={digitVariants}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.12 }}
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
              }}
            />
          )}
        </motion.div>
      ))}
    </motion.div>
  )
}
