/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./shared/types.ts"
  ],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'primary-green': {
          light: '#5A9E78',
          DEFAULT: '#2D5A3D',
          dark: '#1A3A26'
        },
        'sky-blue': {
          light: '#7CB8D9',
          DEFAULT: '#4A90B8',
          dark: '#2E6A8F'
        },
        'amber': {
          light: '#F0C36A',
          DEFAULT: '#E8A838',
          dark: '#B8812A'
        },
        'soil-brown': {
          light: '#A88632',
          DEFAULT: '#8B6914',
          dark: '#6B5010'
        }
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' }
        }
      }
    },
  },
  plugins: [],
};
