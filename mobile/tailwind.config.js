/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        coral: {
          DEFAULT: '#EB5053',
          light: '#FFF0EE',
        },
        ink: '#1A1A1A',
      },
    },
  },
  plugins: [],
};
