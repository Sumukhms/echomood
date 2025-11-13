/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'happy-dark': '#0f3d0f',
        'happy-light': '#2a5b2a',
        'happy-border': '#3e8e41',

        'sad-dark': '#0f1a3d',
        'sad-light': '#2a3a5b',
        'sad-border': '#3e5e8e',

        'angry-dark': '#3d0f0f',
        'angry-light': '#5b2a2a',
        'angry-border': '#8e3e3e',

        'calm-dark': '#0f3d3d',
        'calm-light': '#2a5b5b',
        'calm-border': '#3e8e8e',

        'energetic-dark': '#3d2f0f',
        'energetic-light': '#5b4a2a',
        'energetic-border': '#8e7a3e',
      }
    },
  },
  plugins: [],
}