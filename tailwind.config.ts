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
        // Legacy tokens (auth pages still use these)
        'app-bg':      '#09090B',
        'app-card':    '#111113',
        'app-border':  '#27272A',
        'txt-primary': '#FAFAFA',
        'txt-muted':   '#52525B',
        'st-critical': '#EF4444',
        'st-warning':  '#F59E0B',
        'st-healthy':  '#22C55E',
        'st-info':     '#3B82F6',
        // Auth accent (NOVIX green — do NOT change)
        'accent': '#AADD00',
        // Dashboard design tokens — reference CSS variables
        'd-bg':      'var(--bg)',
        'd-bg2':     'var(--bg2)',
        'd-bg3':     'var(--bg3)',
        'd-bg4':     'var(--bg4)',
        'd-line':    'var(--line)',
        'd-line2':   'var(--line2)',
        'd-muted':   'var(--muted)',
        'd-sub':     'var(--sub)',
        'd-text':    'var(--text)',
        'd-text2':   'var(--text2)',
        'd-accent':  'var(--accent)',
        'd-accent2': 'var(--accent2)',
        'd-green':   'var(--green)',
        'd-amber':   'var(--amber)',
        'd-red':     'var(--red)',
        'd-blue':    'var(--blue)',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'Geist Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
