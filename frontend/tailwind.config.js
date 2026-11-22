/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        kukar: {
          emerald: '#0B4F3A',
          deep: '#073829',
          light: '#E8F3EE',
          gold: '#C99A2E',
          goldlight: '#FDF6E4',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
