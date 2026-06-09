import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'app-bg':      '#0A0A0F',
        'app-card':    '#111118',
        'app-border':  '#1E1E2E',
        'accent':      '#AADD00',
        'txt-primary': '#F0F0F5',
        'txt-muted':   '#6B6B80',
        'st-critical': '#FF4444',
        'st-warning':  '#F5A623',
        'st-healthy':  '#00C853',
        'st-info':     '#2979FF',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
