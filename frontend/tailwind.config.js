/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          400: '#F3E5AB', // Soft champagne
          500: '#D4AF37', // Classic metallic gold
          600: '#AA8C2C', // Deep gold for hover states
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['Montserrat', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 4s linear infinite',
        'eq-1': 'eq 1s ease-in-out infinite alternate',
        'eq-2': 'eq 1.2s ease-in-out infinite alternate-reverse',
        'eq-3': 'eq 0.8s ease-in-out infinite alternate',
      },
      keyframes: {
        eq: {
          '0%': { height: '20%' },
          '100%': { height: '100%' },
        }
      }
    },
  },
  plugins: [],
}