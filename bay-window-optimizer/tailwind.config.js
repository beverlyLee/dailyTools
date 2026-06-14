/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        wood: {
          50: '#fdf8f3',
          100: '#f9efe3',
          200: '#f0d9c0',
          300: '#e5be93',
          400: '#d99d63',
          500: '#cf8342',
          600: '#c26e36',
          700: '#a1562e',
          800: '#82462b',
          900: '#6a3b25',
        }
      }
    },
  },
  plugins: [],
}
