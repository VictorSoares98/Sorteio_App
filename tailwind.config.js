/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF8C00', // Laranja Escuro
        secondary: '#FFC125', // Dourado Claro
        danger: '#e3342f', // Mantido o vermelho para alertas
        'primary-dark': '#E67E00',
        'primary-light': '#FFA333',
        'secondary-dark': '#E6AE22',
        'secondary-light': '#FFD24D',
        
        // Sobrescrever explicitamente cores que possam estar sendo usadas
        'blue-600': '#FF8C00', // Redirecionar para primary
        'blue-700': '#E67E00', // Redirecionar para primary-dark
        'blue-800': '#E67E00', // Redirecionar para primary-dark
      },
      maxWidth: {
        'lg': '32rem', // Definição explícita para max-w-lg
      }
    },
  },
  safelist: [
    'max-w-lg',
    // Classes de cor primária e suas variantes
    'bg-primary',
    'hover:bg-primary',
    'text-primary',
    'border-primary',
    'ring-primary',
    'focus:ring-primary',
    // Classes de cor secundária e suas variantes
    'bg-secondary',
    'hover:bg-secondary',
    'text-secondary',
    'border-secondary',
    'ring-secondary',
    // Classes de cor primary-dark e suas variantes
    'bg-primary-dark',
    'hover:bg-primary-dark',
    'text-primary-dark',
    'border-primary-dark',
    // Classes de cor secondary-dark e suas variantes
    'bg-secondary-dark',
    'hover:bg-secondary-dark',
    'text-secondary-dark',
    'border-secondary-dark',
    // Classes de cor primary-light e suas variantes
    'bg-primary-light',
    'hover:bg-primary-light',
    'text-primary-light',
    'border-primary-light',
    // Classes de cor secondary-light e suas variantes
    'bg-secondary-light',
    'hover:bg-secondary-light',
    'text-secondary-light',
    'border-secondary-light',
  ],
  plugins: [
    // Adicionar plugin para forçar a prioridade das cores customizadas
    function({ addBase }) {
      addBase({
        ':root': {
          '--color-primary': '#FF8C00',
          '--color-secondary': '#FFC125',
          '--color-primary-dark': '#E67E00',
        }
      })
    }
  ],
}
