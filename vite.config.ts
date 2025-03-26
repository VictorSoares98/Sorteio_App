import { defineConfig } from 'vite'
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
    // Adicionar sourcemaps para facilitar debug em produção
    sourcemap: true,
    // Configuração para evitar problemas de MIME type
    rollupOptions: {
      output: {
        // Usar nomenclatura mais explícita para os chunks
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
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
          // Outros node_modules
          if (id.includes('node_modules')) {
            return 'vendor-other';
          }
        }
      }
    }
  },
  server: {
    // Configurações para desenvolvimento local
    port: 5173,
    open: true
  },
  // Configuração para melhorar o suporte a importações dinâmicas
  optimizeDeps: {
    // Incluir explicitamente as dependências principais
    include: ['vue', 'vue-router', 'pinia', 'firebase/app', 'firebase/auth', 'firebase/firestore']
  },
  // Permite importações dinâmicas, ainda que com warnings em desenvolvimento
  esbuild: {
    logOverride: { 'dynamic-import-in-replicated-modules': 'silent' }
  }
})
