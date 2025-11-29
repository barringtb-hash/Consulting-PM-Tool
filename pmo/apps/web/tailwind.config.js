/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary brand color - Launchpad Consulting Partners Orange
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Primary brand color - Orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        // Brand accent colors - Launchpad Consulting Partners
        brand: {
          primary: '#F97316', // Primary - main headings (Orange)
          orange: '#F97316', // Secondary - sunrise gradient center
          yellow: '#FCD34D', // Accent - sun rays
          red: '#EF4444', // Gradient top (reserved for alerts)
          amber: '#F59E0B', // Gradient bottom
          rose: '#9F1239', // Horizon line accent
        },
        // Neutral grays - Warm grays with subtle brown/beige undertones
        neutral: {
          50: '#fafaf9', // Warmer page background
          100: '#f5f5f4', // Warmer card backgrounds
          200: '#e7e5e4', // More visible borders
          300: '#d6d3d1', // Warmer mid-tone
          400: '#a8a29e', // Balanced warm gray
          500: '#78716c', // Warm medium gray
          600: '#57534e', // Deeper warm gray
          700: '#44403c', // Warm text labels, easier on eyes
          800: '#292524', // Dark warm gray
          900: '#1c1917', // Warmer primary text with higher contrast
          950: '#0c0a09', // Deepest warm black
        },
        // Semantic colors - Enhanced for better readability
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#16a34a', // Shifted from bright lime to professional forest green
          600: '#15803d', // Deeper for better contrast
          700: '#166534',
          800: '#14532d', // Enhanced text readability
          900: '#052e16',
        },
        warning: {
          50: '#fefce8', // Warmer yellow-beige background
          100: '#fef9c3', // Amber tones
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308', // Shifted from orange to amber for better differentiation
          600: '#ca8a04', // More distinct from danger
          700: '#a16207',
          800: '#854d0e', // Better text contrast
          900: '#713f12',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#dc2626', // Deeper, more authoritative red
          600: '#b91c1c', // Enhanced contrast for error states
          700: '#991b1b',
          800: '#7f1d1d', // Better text readability
          900: '#450a0a',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
      borderRadius: {
        none: '0',
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT:
          '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
};
