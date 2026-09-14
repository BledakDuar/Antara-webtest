/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        antara: {
          bg: '#FBFBF9',
          surface: '#FFFFFF',
          subtle: '#F8FAFC',
          border: '#E2E8F0',
          'border-dark': '#CBD5E1',
          text: '#0F172A',
          body: '#334155',
          muted: '#64748B',
          purple: '#7C3AED',
          'purple-hover': '#6D28D9',
          'purple-light': '#8B5CF6',
          'purple-soft': '#F5F3FF',
          'purple-border': '#DDD6FE',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'clean': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'clean-md': '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
