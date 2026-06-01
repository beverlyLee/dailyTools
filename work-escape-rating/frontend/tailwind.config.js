/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{svelte,js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#165DFF',
        secondary: '#722ED1',
        success: '#00B42A',
        warning: '#FF7D00',
        danger: '#F53F3F',
        coffee: {
          50: '#F8F4F0',
          100: '#EBE0D5',
          200: '#D4C0AA',
          300: '#BFA07F',
          400: '#A98054',
          500: '#8F673B',
          600: '#70502E',
          700: '#513921',
          800: '#322214',
          900: '#130B07'
        }
      }
    }
  },
  plugins: []
}
