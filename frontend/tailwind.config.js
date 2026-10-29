/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        palegreen: {
          DEFAULT: '#9FBCAD',
          50: '#f4f8f6',
          100: '#e5efe9',
          200: '#cbdfd4',
          300: '#accbbb',
          400: '#9FBCAD',
          500: '#7fa694',
          600: '#638c79',
          700: '#4f7061',
          800: '#415a4f',
          900: '#364b42',
        },
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
        }
      }
    },
  },
  plugins: [],
}
