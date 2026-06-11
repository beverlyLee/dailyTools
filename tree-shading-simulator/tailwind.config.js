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
        forest: {
          50: '#f0f7f3',
          100: '#d9ebe0',
          200: '#b3d7c1',
          300: '#82ba9a',
          400: '#529972',
          500: '#2d6a4f',
          600: '#22543d',
          700: '#1b4332',
          800: '#153426',
          900: '#0f241a',
        },
        sky2: {
          50: '#f0f9fc',
          100: '#d9f0f7',
          200: '#b7e1ef',
          300: '#85cce4',
          400: '#48cae4',
          500: '#00b4d8',
          600: '#0096c7',
          700: '#0077b6',
          800: '#023e8a',
          900: '#03045e',
        },
        warm: {
          50: '#faf7f1',
          100: '#f5f1e8',
          200: '#ebe2cf',
          300: '#ddcead',
          400: '#ccb585',
          500: '#bc9c62',
          600: '#a8834d',
          700: '#8b6a3f',
          800: '#705536',
          900: '#5c452d',
        },
      },
      fontFamily: {
        display: ["Georgia", "'Times New Roman'", "'Songti SC'", "'STSong'", "serif"],
        sans: ["ui-sans-serif", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "'Helvetica Neue'", "Arial", "'PingFang SC'", "'Microsoft YaHei'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
