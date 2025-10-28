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
          50: '#fef6ee',
          100: '#fdecd7',
          200: '#fad4ae',
          300: '#f7b57a',
          400: '#f38d44',
          500: '#f06d1e',
          600: '#e15214',
          700: '#ba3c13',
          800: '#943217',
          900: '#772b15',
        },
      },
    },
  },
  plugins: [],
}
