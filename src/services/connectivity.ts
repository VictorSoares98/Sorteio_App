import { ref, watch } from 'vue';
import type { ConnectionStatus } from '../types/order';
import { syncOfflineOrders } from './syncService';

// Estado reativo para a conectividade
const connectionStatus = ref<ConnectionStatus>('online');
const isOnline = ref(true);

// Inicializar o serviço de conectividade
export const initConnectivityService = () => {
  // Configurar ouvintes de eventos de conectividade
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Estado inicial
  isOnline.value = navigator.onLine;
  connectionStatus.value = navigator.onLine ? 'online' : 'offline';
  
  // Observar mudanças no estado online
  watch(isOnline, async (newValue) => {
    if (newValue === true) {
      // Conectividade restaurada
      console.log('Conectividade restaurada. Iniciando sincronização...');
      connectionStatus.value = 'reconnecting';
      
      try {
        // Tentar sincronizar pedidos offline
        await syncOfflineOrders();
        connectionStatus.value = 'online';
      } catch (error) {
        console.error('Erro na sincronização automática:', error);
        connectionStatus.value = 'online'; // Ainda estamos online mesmo se a sincronização falhar
      }
    }
  });
  
  return {
    connectionStatus,
    isOnline
  };
};

// Manipulador para evento online
const handleOnline = () => {
  console.log('Dispositivo está online');
  isOnline.value = true;
};

// Manipulador para evento offline
const handleOffline = () => {
  console.log('Dispositivo está offline');
  isOnline.value = false;
  connectionStatus.value = 'offline';
};

// Limpar ouvintes quando não forem mais necessários
export const cleanupConnectivityService = () => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
};

// Exportar estado reativo
export const useConnectionStatus = () => {
  return {
    connectionStatus,
    isOnline
  };
};
