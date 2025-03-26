import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Usar caminho absoluto para o Firebase Hosting funcionar corretamente
  base: '/',
  build: {
    outDir: 'dist',
    // Garantir que os assets são gerados corretamente
    assetsDir: 'assets',
    // Configuração para evitar problemas de MIME type
    rollupOptions: {
      output: {
        // Usar nomenclatura mais explícita para os chunks
        entryFileNames: 'assets/[name].[hash].mjs',
        chunkFileNames: 'assets/[name].[hash].mjs',
        assetFileNames: 'assets/[name].[hash].[ext]',
        // Forçar extensão .mjs para garantir que são tratados como módulos ES
        format: 'es',
        // Estratégia de chunking manual para melhor divisão
        manualChunks: (id) => {
          // Agrupar dependências de firestore para otimizar
          if (id.includes('firebase/firestore')) {
            return 'vendor-firestore';
          }
          // Agrupar outras dependências do Firebase
          if (id.includes('firebase/') && !id.includes('firestore')) {
            return 'vendor-firebase-core';
          }
          // Vue e dependências relacionadas
          if (id.includes('vue') || id.includes('pinia')) {
            return 'vendor-vue';
          }
          // Agrupar demais node_modules
          if (id.includes('node_modules')) {
            return 'vendor-other';
          }
        }
      }
    },
    // Adicionar sourcemaps para facilitar debug em produção
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'punycode': 'punycode/'
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      // Suprimir avisos de depreciação relacionados ao punycode
      logOverride: {
        'deprecated-punycode': 'silent'
      }
    }
  }
})
