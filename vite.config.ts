import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Usar caminho absoluto para o Firebase Hosting funcionar corretamente
  base: '/',
  build: {
    outDir: 'dist',
    // Garantir que os assets são gerados corretamente
    assetsDir: 'assets',
    // Reduzir sourcemap em produção para melhorar performance
    sourcemap: false,
    // Aumentar o limite de aviso para chunks grandes
    chunkSizeWarningLimit: 1000,
    // Configuração para evitar problemas de MIME type
    rollupOptions: {
      output: {
        // Usar nomenclatura mais explícita para os chunks
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
  // Desativar HMR em produção de forma explícita
  server: {
    hmr: process.env.NODE_ENV === 'production' ? false : {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    }
  }
})
