/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        quicksand: ['var(--font-heading)', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        script: ['var(--font-script)', 'cursive'],
      },
      colors: {
        brand: {
          50: '#f7f7f5',
          100: '#f0f0ed',
          200: '#e0e0dc',
          300: '#c8c8c4',
          400: '#a8a8a4',
          500: '#888884',
          600: '#686864',
          700: '#484844',
          800: '#383834',
          900: '#282824',
          950: '#181814',
        },
        teal: {
          50: '#f0f9fa',
          100: '#e0f5f4',
          200: '#bceceb',
          300: '#8cdcdb',
          400: '#5bbcbe',
          500: '#3ea1a3',
          600: '#318285',
          700: '#2a696b',
          800: '#265557',
          900: '#224648',
          950: '#11292b',
        },
      },
    },
  },
  plugins: [],
}
