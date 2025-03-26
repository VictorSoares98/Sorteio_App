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
    // Adicionar hash aos nomes dos arquivos para evitar problemas de cache
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        // Estratégia de chunking manual para melhor divisão
        manualChunks: (id) => {
          // Separar dependências grandes em chunks próprios
          if (id.includes('node_modules')) {
            // Firebase em um chunk separado
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            
            // Vue e ferramentas relacionadas em outro chunk
            if (id.includes('vue') || id.includes('pinia')) {
              return 'vendor-vue';
            }
            
            // Outras bibliotecas em um chunk compartilhado
            return 'vendor';
          }
          
          // Agrupar componentes por tipo/recurso
          if (id.includes('/src/components/')) {
            if (id.includes('/admin/')) {
              return 'components-admin';
            }
            if (id.includes('/forms/')) {
              return 'components-forms';
            }
            if (id.includes('/profile/')) {
              return 'components-profile';
            }
            if (id.includes('/ui/')) {
              return 'components-ui';
            }
            return 'components-common';
          }
          
          // Agrupar serviços e stores
          if (id.includes('/src/services/')) {
            return 'services';
          }
          if (id.includes('/src/stores/')) {
            return 'stores';
          }
        }
      }
    }
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
