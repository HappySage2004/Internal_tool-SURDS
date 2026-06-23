/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        'text-default': 'var(--text)',
        'text-muted': 'var(--text-muted)',
        'text-faint': 'var(--text-faint)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        'page-title': ['21px', { fontWeight: '500', lineHeight: '1.3' }],
        'section-header': ['15px', { fontWeight: '500', lineHeight: '1.4' }],
        body: ['14px', { fontWeight: '400', lineHeight: '1.5' }],
        meta: ['12px', { fontWeight: '400', lineHeight: '1.4' }],
        meta13: ['13px', { fontWeight: '400', lineHeight: '1.4' }],
      },
      borderRadius: {
        control: '6px',
        panel: '8px',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'ease-in-out',
      },
    },
  },
  plugins: [],
}
