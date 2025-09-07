/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary UI colors based on existing theme
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#007bff', // Matches existing COLORS.ui.primary
          600: '#0056b3',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a'
        },
        // Gray scale based on existing UI colors
        gray: {
          50: '#f8f9fa', // COLORS.ui.gray100
          100: '#f8f9fa',
          200: '#e9ecef', // COLORS.ui.gray200
          300: '#dee2e6', // COLORS.ui.gray300
          400: '#ced4da', // COLORS.ui.gray400
          500: '#adb5bd', // COLORS.ui.gray500
          600: '#6c757d', // COLORS.ui.gray600
          700: '#495057', // COLORS.ui.gray700
          800: '#343a40', // COLORS.ui.gray800
          900: '#212529' // COLORS.ui.gray900
        },
        // Selection colors
        selection: {
          primary: '#007acc',
          outline: '#1e40af',
          secondary: '#ff9999',
          secondaryOutline: '#dc3545'
        },
        // Semantic colors
        success: '#28a745',
        warning: '#ffc107',
        danger: '#dc3545',
        info: '#17a2b8'
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'monospace']
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem'
      },
      spacing: {
        0.5: '0.125rem',
        1.5: '0.375rem',
        2.5: '0.625rem',
        3.5: '0.875rem'
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem'
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
        lg: '0 4px 8px 0 rgba(0, 0, 0, 0.15)'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class'
    })
  ]
}
