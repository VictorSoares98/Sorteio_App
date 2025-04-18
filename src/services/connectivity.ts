import { ref } from 'vue';

// Estado reativo para a conectividade
const isOnline = ref(navigator.onLine);

// Inicializar o serviço básico de conectividade
export const initConnectivityService = () => {
  console.log('[Connectivity] Inicializando serviço de conectividade básico');
  
  // Configurar ouvintes de eventos de conectividade
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Estado inicial
  isOnline.value = navigator.onLine;
  
  console.log(`[Connectivity] Estado inicial: ${isOnline.value ? 'online' : 'offline'}`);
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

// Hook simplificado
export const useConnectionStatus = () => {
  return {
    isOnline
  };
};
