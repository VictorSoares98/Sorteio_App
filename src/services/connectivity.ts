import { ref } from 'vue';

// Estado reativo para a conectividade
const isOnline = ref(navigator.onLine);
// Novo estado para rastrear se serviços externos estão bloqueados
const isServiceBlocked = ref(false);
// Estado para rastrear se o aviso já foi mostrado
const hasShownBlockWarning = ref(false);

// Inicializar o serviço básico de conectividade
export const initConnectivityService = () => {
  console.log('[Connectivity] Inicializando serviço de conectividade básico');
  
  // Configurar ouvintes de eventos de conectividade
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Estado inicial
  isOnline.value = navigator.onLine;
  
  console.log(`[Connectivity] Estado inicial: ${isOnline.value ? 'online' : 'offline'}`);
  
  // Iniciar detecção de bloqueios
  detectServiceBlocking();
};

// Manipulador para evento online
const handleOnline = () => {
  console.log('[Connectivity] Dispositivo está online');
  isOnline.value = true;
};

// Manipulador para evento offline
const handleOffline = () => {
  console.log('[Connectivity] Dispositivo está offline');
  isOnline.value = false;
};

// Limpar ouvintes quando não forem mais necessários
export const cleanupConnectivityService = () => {
  console.log('[Connectivity] Limpando serviço de conectividade');
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
};

// Função para detectar bloqueios de serviços externos
const detectServiceBlocking = async () => {
  try {
    // Criar um iframe oculto para testar a conexão
    const tester = document.createElement('iframe');
    tester.style.display = 'none';
    document.body.appendChild(tester);
    
    // Registrar evento para interceptar erros de rede
    const originalFetch = window.fetch;
    
    // Substituir fetch para monitorar erros em requisições a serviços externos
    window.fetch = async function(input, init) {
      try {
        const response = await originalFetch.apply(this, [input, init]);
        return response;
      } catch (error) {
        // Verificar se a requisição era para serviços que podem ser bloqueados
        const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
        if (url.includes('googleapis.com')) {
          console.warn('[Connectivity] Detectado bloqueio de recursos externos via fetch');
          isServiceBlocked.value = true;
        }
        throw error;
      }
    };
    
    // Monitorar erros nas requisições
    window.addEventListener('error', function(e) {
      if (e.target instanceof HTMLScriptElement || 
        e.target instanceof HTMLLinkElement || 
        e.target instanceof HTMLImageElement) {
        if ((e.target instanceof HTMLScriptElement || e.target instanceof HTMLImageElement) && 
            e.target.src && (e.target.src.includes('googleapis.com'))) {
          console.warn('[Connectivity] Detectado possível bloqueio de recursos externos');
          isServiceBlocked.value = true;
        } else if (e.target instanceof HTMLLinkElement && 
            e.target.href && (e.target.href.includes('googleapis.com'))) {
          console.warn('[Connectivity] Detectado possível bloqueio de recursos externos');
          isServiceBlocked.value = true;
        }
      }
    }, true);
    
    // Limpar teste após verificação
    setTimeout(() => {
      try {
        document.body.removeChild(tester);
      } catch (e) {
        // Ignorar erros de limpeza
      }
    }, 5000);
  } catch (err) {
    console.error('[Connectivity] Erro ao verificar bloqueio de serviços:', err);
  }
};

// Exportar o estado reativo
export const useConnectionStatus = () => {
  return {
    isOnline,
    isServiceBlocked,
    hasShownBlockWarning
  };
};
