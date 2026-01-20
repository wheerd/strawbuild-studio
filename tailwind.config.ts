import formsPlugin from '@tailwindcss/forms'
import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  plugins: [formsPlugin({ strategy: 'class' })]
} satisfies Config
