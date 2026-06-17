/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        earth: {
          50: '#FAF3E0',
          100: '#F5ECD0',
          200: '#E8D5A3',
          300: '#D4B978',
          400: '#C49B55',
          500: '#3E2723',
          600: '#33201C',
          700: '#281915',
          800: '#1D120E',
          900: '#120B08',
        },
        soil: {
          green: '#2E7D32',
          'green-light': '#A5D6A7',
          'green-dark': '#1B5E20',
          yellow: '#F9A825',
          red: '#C62828',
          blue: '#1565C0',
        },
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
