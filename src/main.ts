import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { useAuthStore } from './stores/authStore'

// Declare Vite-specific properties on the Window interface
declare global {
  interface Window {
    __vite_ssr_dynamic_import?: (chunk: string) => Promise<any>;
    __vite_dynamic_import?: (chunk: string) => Promise<any>;
    __vite_is_modern_browser?: boolean;
    __vite_is_legacy_browser?: boolean;
    loadModuleWithFallback?: (moduleUrl: string, maxRetries?: number) => Promise<any>;
  }
}

// Adicionar logging detalhado para diagnóstico
console.log('[App] Inicializando aplicação');
console.log('[App] Versão da build:', import.meta.env.PROD ? 'produção' : 'desenvolvimento');
console.log('[App] Base URL:', import.meta.env.BASE_URL);
console.log('[App] Modo:', import.meta.env.MODE);
console.log('[App] Assets:', import.meta.env.BASE_URL + 'assets/');

// Função para capturar erros no carregamento de chunks e usar nosso fallback
const originalImport = window.__vite_ssr_dynamic_import || window.__vite_dynamic_import;
if (originalImport && window.loadModuleWithFallback) {
  const handleChunkError = (e: Error) => {
    console.error('[Chunk Load Error]', e);
    const appLoading = document.getElementById('app-loading');
    if (appLoading) {
      appLoading.innerHTML = `
        <h2 style="color: #FF8C00; margin-bottom: 20px;">Erro ao carregar módulo</h2>
        <p style="margin-bottom: 20px;">Ocorreu um erro ao carregar um módulo da aplicação.</p>
        <div style="background: #f8f8f8; padding: 12px; border-radius: 4px; max-width: 100%; overflow-x: auto; text-align: left;">
          <code style="color: #d63031; white-space: pre-wrap;">${e?.message || 'Erro desconhecido no carregamento de chunks'}</code>
        </div>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 8px 16px; background: #FF8C00; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Tentar novamente
        </button>
      `;
    }
    throw e;
  };

  // Substituir o importador dinâmico do Vite com nossa versão com fallback
  window.__vite_ssr_dynamic_import = window.__vite_dynamic_import = (chunk) => {
    // Usar nosso carregador com fallback
    return window.loadModuleWithFallback?.(chunk, 3) || originalImport(chunk).catch(handleChunkError);
  };
}

// Capturar erros de promises não tratadas
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Promise Error]', event.reason);
});

// Catch erros globais para melhor diagnóstico
window.addEventListener('error', (event) => {
  console.error('[App Error]', event.error);
});

// Inicializar aplicação
try {
  console.log('[App] Criando instância do Vue');
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(router)

  // Adicionar manipulador global de erros
  app.config.errorHandler = (err, instance, info) => {
    console.error('[Vue Error]', err);
    console.error('Component:', instance ? (instance.$options?.name || 'unnamed-component') : 'unknown');
    console.error('Info:', info);
  };

  // Inicializar o authStore com o router antes de montar a aplicação
  const authStore = useAuthStore()
  authStore.init(router)

  console.log('[App] Montando aplicação no elemento #app');
  app.mount('#app')
  console.log('[App] Aplicação montada com sucesso');
  
  // Remover loader quando a aplicação estiver montada
  const loader = document.getElementById('app-loading');
  if (loader && loader.parentNode) {
    loader.parentNode.removeChild(loader);
  }
} catch (error: unknown) {
  console.error('[App] Erro fatal durante inicialização:', error);
  // Adicionar notificação visual para o usuário em caso de erro crítico
  const appElement = document.getElementById('app');
  if (appElement) {
    appElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: sans-serif;">
        <h2 style="color: #FF8C00;">Ocorreu um erro</h2>
        <p>Não foi possível carregar a aplicação. Tente recarregar a página.</p>
        <div style="background: #f8f8f8; padding: 12px; border-radius: 4px; max-width: 100%; overflow-x: auto; margin: 20px auto; text-align: left;">
          <code style="color: #d63031; white-space: pre-wrap;">${error instanceof Error ? error.message : 'Erro desconhecido'}</code>
        </div>
        <button onclick="location.reload()" style="padding: 8px 16px; background: #FF8C00; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 16px;">
          Recarregar Página
        </button>
      </div>
    `;
  }
}