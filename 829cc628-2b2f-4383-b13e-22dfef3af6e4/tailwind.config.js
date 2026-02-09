
/** @type {import('tailwindcss').Config} */
export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        script: ['"Dancing Script"', 'cursive'],
      },
      colors: {
        brand: {
          50: '#f7f7f5', // Warm light gray background
          100: '#f0f0ed',
          200: '#e0e0dc',
          300: '#c8c8c4',
          400: '#a8a8a4',
          500: '#888884',
          600: '#686864',
          700: '#484844', // Dark text
          800: '#383834',
          900: '#282824',
          950: '#181814',
        },
        teal: {
          50: '#f0f9fa',
          100: '#e0f5f4', // Badge bg
          200: '#bceceb',
          300: '#8cdcdb',
          400: '#5bbcbe', // Primary brand teal
          500: '#3ea1a3',
          600: '#318285',
          700: '#2a696b',
          800: '#265557',
          900: '#224648',
          950: '#11292b',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
