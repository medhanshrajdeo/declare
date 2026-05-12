/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: '#0c4a2a',
          dark: '#053019',
          light: '#1a6b40',
        },
      },
      fontFamily: {
        display: ['"Cinzel"', 'serif'],
      },
      boxShadow: {
        card: '0 6px 14px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};
