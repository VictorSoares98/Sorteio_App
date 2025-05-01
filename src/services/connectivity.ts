import { ref } from 'vue';

// Configurable constant for the test URL
const TEST_URL = 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg';

// Estado reativo para a conectividade
export const isOnline = ref(navigator.onLine);
// Novo estado para rastrear se serviços externos estão bloqueados
export const isServiceBlocked = ref(false);
// Estado para rastrear se o aviso já foi mostrado
const hasShownBlockWarning = ref(false);
// Variável para guardar a função de limpeza do intervalo
let connectivityInterval: (() => void) | null = null; // Stores the cleanup function for service blocking detection

/**
 * Atualiza o estado de conectividade globalmente
 * Exposta para permitir sincronização com o estado real do Firestore
 * 
 * @param online Novo estado de conectividade
 */
export function updateConnectionState(online: boolean): void {
  if (isOnline.value !== online) {
    console.log(`[Connectivity] Atualizando estado para: ${online ? 'online' : 'offline'}`);
    isOnline.value = online;
  }
}

// Inicializar o serviço básico de conectividade
export const initConnectivityService = (customIntervalMs: number = 60000) => {
  console.log('[Connectivity] Inicializando serviço de conectividade básico');
  
  // Configurar ouvintes de eventos de conectividade
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Novo: ouvinte para eventos personalizados de bloqueio
  document.addEventListener('serviceBlocked', handleServiceBlocked);
  
  // Estado inicial
  isOnline.value = navigator.onLine;
  
  console.log(`[Connectivity] Estado inicial: ${isOnline.value ? 'online' : 'offline'}`);
  
  // Iniciar detecção passiva de bloqueios
  connectivityInterval = detectServiceBlockingPassive(customIntervalMs, 5000, TEST_URL); // Pass the test URL explicitly
};

// Example: Ensure cleanupConnectivityService is called when the service is disposed
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleanupConnectivityService();
  });
}

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

// Manipulador para eventos de bloqueio de serviço
const handleServiceBlocked = (event: Event) => {
  const customEvent = event as CustomEvent;
  console.warn('[Connectivity] Serviço externo bloqueado detectado', customEvent.detail);
  isServiceBlocked.value = true;
  
  if (!hasShownBlockWarning.value) {
    // Aqui você pode implementar lógica para mostrar um aviso ao usuário
    // apenas uma vez por sessão
    hasShownBlockWarning.value = true;
  }
};

// Limpar ouvintes quando não forem mais necessários
export const cleanupConnectivityService = () => {
  console.log('[Connectivity] Limpando serviço de conectividade');
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  document.removeEventListener('serviceBlocked', handleServiceBlocked);
  
  if (connectivityInterval) {
    connectivityInterval(); // Call the cleanup function to clear the interval
    connectivityInterval = null;
  }
};

/**
 * Método passivo de detecção que verifica periodicamente o acesso a serviços externos
 * 
 * @param intervalMs Intervalo em milissegundos entre verificações
 * @param timeoutMs Tempo máximo de espera para cada verificação
 * @param testUrl URL do recurso a ser testado
 * @returns Função de limpeza para cancelar o intervalo
 */
const detectServiceBlockingPassive = (
  intervalMs: number = 60000, // Default interval of 1 minute
  timeoutMs: number = 5000, // Default timeout of 5 seconds
  testUrl: string = TEST_URL // Configurable test URL with a default value
): (() => void) => {
  
  // Função para emitir evento de mudança de estado
  const emitBlockingEvent = (blocked: boolean) => {
    if (isServiceBlocked.value !== blocked) {
      isServiceBlocked.value = blocked;
      
      // Emitir evento personalizado para o resto da aplicação
      const event = new CustomEvent('serviceBlockingChanged', { 
        detail: { blocked } 
      });
      document.dispatchEvent(event);
      
      console.log(`[Connectivity] Estado de bloqueio de serviço: ${blocked ? 'BLOQUEADO' : 'ACESSÍVEL'}`);
    }
  };
  
  // Verificar conectividade periodicamente com serviços externos
  const checkInterval = setInterval(() => {
    if (navigator.onLine) {
      // Usar verificação de recursos estáticos em vez de API
      const img = new Image();
      
      const timeout = setTimeout(() => {
        console.warn('[Connectivity] Timeout ao carregar recurso estático Google/Firebase');
        emitBlockingEvent(true);
        img.src = ''; // Cancel image loading
      }, timeoutMs);
      
      img.onload = () => {
        clearTimeout(timeout);
        // Se carregou com sucesso, o serviço está acessível
        console.debug('[Connectivity] Verificação de conectividade: serviço acessível');
        emitBlockingEvent(false); // Restaurar estado se estava bloqueado anteriormente
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        // Se falhou ao carregar, pode indicar um bloqueio de firewall/proxy
        console.warn('[Connectivity] Falha ao carregar recurso estático Google/Firebase');
        emitBlockingEvent(true);
      };
      
      // Adicionar timestamp para evitar cache
      img.src = `${testUrl}?_t=${Date.now()}`;
    }
  }, intervalMs); // Verificar com o intervalo configurável
  
  // Retorna uma função para limpar o intervalo quando necessário
  return () => clearInterval(checkInterval);
};

// Exportar o estado reativo
export const useConnectionStatus = () => {
  return {
    isOnline,
    isServiceBlocked,
    hasShownBlockWarning
  };
};
