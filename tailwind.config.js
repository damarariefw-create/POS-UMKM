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
          DEFAULT: '#1B7647',
          hover: '#155d37',
          light: '#e8f4ed',
          dark: '#0f482a',
        },
        destructive: {
          DEFAULT: '#E15A5A',
          hover: '#c94444',
          light: '#fdf2f2',
        },
        background: '#F8F9FA',
        surface: '#FFFFFF',
        'text-primary': '#212529',
        'text-secondary': '#6C757D',
        'border-custom': '#DEE2E6',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        md: '8px',
        lg: '12px',
      }
    },
  },
  plugins: [],
}
