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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/utils/vitest-setup.ts', './__tests__/setup.ts'],
    include: [
      '**/*.{test,spec,visual,e2e}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      '**/node_modules/**', 
      '**/dist/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        '.storybook/',
        '**/*.d.ts',
        '**/stories/**',
        '**/*.stories.{js,ts}'
      ]
    },
    deps: {
      inline: ['vuetify']
    },
    server: {
      deps: {
        external: ['firebase']
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
