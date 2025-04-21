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
    // Adicionar sourcemaps para facilitar debug em produção
    sourcemap: true,
    // Aumentar o limite de aviso para chunks grandes
    chunkSizeWarningLimit: 800,
    // Configuração para evitar problemas de MIME type
    rollupOptions: {
      output: {
        // Usar nomenclatura mais explícita para os chunks
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        // Estratégia de chunking manual para melhor divisão
        manualChunks: (id) => {
          // Firebase - dividido em módulos específicos
          if (id.includes('firebase/firestore')) {
            return 'vendor-firestore';
          }
          if (id.includes('firebase/auth')) {
            return 'vendor-firebase-auth';
          }
          if (id.includes('firebase/analytics') || id.includes('firebase/app')) {
            return 'vendor-firebase-core';
          }
          if (id.includes('firebase/') && !id.includes('firestore') && !id.includes('auth') && !id.includes('app')) {
            return 'vendor-firebase-other';
          }
          
          // Vue ecosystem - separar Vue de Pinia para melhor reuso
          if (id.includes('vue') && !id.includes('vue-router')) {
            return 'vendor-vue-core';
          }
          if (id.includes('vue-router')) {
            return 'vendor-vue-router';
          }
          if (id.includes('pinia')) {
            return 'vendor-pinia';
          }
          
          // Chart.js e componentes relacionados - geralmente grandes
          if (id.includes('chart.js') || id.includes('vue-chartjs')) {
            return 'vendor-charts';
          }
          
          // Luxon - biblioteca de datas que pode ser grande
          if (id.includes('luxon')) {
            return 'vendor-date-utils';
          }
          
          // UI components específicos
          if (id.includes('@vuepic/vue-datepicker')) {
            return 'vendor-datepicker';
          }
          
          // Outros node_modules menores agrupados por categoria
          if (id.includes('node_modules') && (
              id.includes('validator') || 
              id.includes('format') || 
              id.includes('util'))) {
            return 'vendor-utils';
          }
          
          // Demais dependências
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
    open: true,
    // Configuração melhorada para WebSocket
    hmr: {
      // Configurar protocolo explicitamente
      protocol: 'ws',
      // Garantir que o host seja correto
      host: 'localhost',
      // Aumentar timeout para evitar desconexões rápidas
      timeout: 120000,
      // Desativar overlay para prevenir problemas de UI relacionados a HMR
      overlay: false
    },
    // Configurações para melhor desempenho do watch
    watch: {
      // Usar polling como fallback se o watching baseado em eventos falhar
      usePolling: true,
      // Intervalo de polling em ms (balanceia CPU e responsividade)
      interval: 1000
    },
    // Configuração de middlewares para WebSocket
    middlewareMode: false,
    // Permitir conexões de qualquer IP na rede local (útil para testes em múltiplos dispositivos)
    host: '0.0.0.0'
  },
  // Configuração para melhorar o suporte a importações dinâmicas
  optimizeDeps: {
    // Incluir explicitamente as dependências principais
    include: ['vue', 'vue-router', 'pinia', 'firebase/app', 'firebase/auth', 'firebase/firestore']
  },
  // Permite importações dinâmicas, ainda que com warnings em desenvolvimento
  esbuild: {
    logOverride: { 'dynamic-import-in-replicated-modules': 'silent' }
  },
  test: {
    globals: true,
    environment: 'jsdom',
  }
})
