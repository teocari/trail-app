import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f172a',
        surface: '#1e293b',
        'surface-2': '#334155',
        easy: '#22c55e',
        hard: '#f97316',
        race: '#ef4444',
        recovery: '#3b82f6',
        accent: '#22c55e',
      },
    },
  },
  plugins: [],
}
export default config
