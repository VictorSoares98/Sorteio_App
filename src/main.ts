import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { useAuthStore } from './stores/authStore'

// Adicionar logging detalhado para diagnóstico
console.log('[App] Inicializando aplicação');
console.log('[App] Versão da build:', import.meta.env.PROD ? 'produção' : 'desenvolvimento');
console.log('[App] Base URL:', import.meta.env.BASE_URL);
console.log('[App] Modo:', import.meta.env.MODE);
console.log('[App] Assets:', import.meta.env.BASE_URL + 'assets/');

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

  // Inicializar o authStore com o router antes de montar a aplicação
  const authStore = useAuthStore()
  authStore.init(router)

  console.log('[App] Montando aplicação no elemento #app');
  app.mount('#app')
  console.log('[App] Aplicação montada com sucesso');
} catch (error) {
  console.error('[App] Erro fatal durante inicialização:', error);
}