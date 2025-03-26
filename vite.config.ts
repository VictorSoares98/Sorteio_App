import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Adicione a configuração de base para o deploy
  base: './', // Use caminho relativo em vez de absoluto
})
