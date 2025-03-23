/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3490dc',
        secondary: '#ffed4a',
        danger: '#e3342f',
      },
      maxWidth: {
        'lg': '32rem', // Definição explícita para max-w-lg
      }
    },
  },
  safelist: [
    'max-w-lg' // Adicionar à safelist para garantir que a classe seja gerada
  ],
  plugins: [],
}
