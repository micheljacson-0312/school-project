/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef6ff',
          100: '#d9eaff',
          200: '#bcdbff',
          300: '#8ec5ff',
          400: '#59a5ff',
          500: '#3385fb',
          600: '#1d64e8',
          700: '#1850c4',
          800: '#18439c',
          900: '#193a7d',
        },
      },
    },
  },
  plugins: [],
};
