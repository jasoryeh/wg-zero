/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  safelist: [
    {
      pattern: /bg-(red|green|blue|orange|yellow|purple)-(100|200|300|400|500|600|700|800|900)/, // You can display all the colors that you need
      variants: ['lg', 'hover', 'focus', 'lg:hover'],      // Optional
    },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  darkMode: 'selector',
}
