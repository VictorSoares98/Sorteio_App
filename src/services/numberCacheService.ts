import { ref } from 'vue';
import { defineStore } from 'pinia';
import { NUMBER_STATUS } from '../utils/batchConstants';
import { getNumberStatus, getNumbersStatusCount } from './raffleBatchService';

/**
 * Store Pinia para cache local de números do sorteio
 * Reduz chamadas ao Firestore e melhora performance
 */
export const useNumberStore = defineStore('numbers', () => {
  // Cache de status de números
  const numbersCache = ref<Map<string, { status: string, timestamp: number }>>(new Map());
  
  // Cache de estatísticas
  const statsCache = ref<{
    available: number;
    pending: number;
    sold: number;
    timestamp: number;
  } | null>(null);

  // Tempo de expiração do cache (5 minutos)
  const CACHE_EXPIRY_MS = 5 * 60 * 1000; 
  
  /**
   * Verifica se um número está disponível (com cache)
   */
  const isNumberAvailable = async (number: string): Promise<boolean> => {
    const now = Date.now();
    const cached = numbersCache.value.get(number);
    
    // Usar cache se existir e não estiver expirado
    if (cached && (now - cached.timestamp < CACHE_EXPIRY_MS)) {
      return cached.status === NUMBER_STATUS.AVAILABLE;
    }
    
    // Buscar do servidor e atualizar cache
    const status = await getNumberStatus(number);
    numbersCache.value.set(number, {
      status: status?.status || NUMBER_STATUS.AVAILABLE,
      timestamp: now
    });
    
    return status?.status === NUMBER_STATUS.AVAILABLE;
  };
  
  /**
   * Obtém estatísticas de números (com cache)
   */
  const getNumberStats = async (): Promise<{
    available: number;
    pending: number;
    sold: number;
  }> => {
    const now = Date.now();
    
    // Usar cache se existir e não estiver expirado
    if (statsCache.value && (now - statsCache.value.timestamp < CACHE_EXPIRY_MS)) {
      return {
        available: statsCache.value.available,
        pending: statsCache.value.pending,
        sold: statsCache.value.sold
      };
    }
    
    // Buscar do servidor e atualizar cache
    const counts = await getNumbersStatusCount();
    
    statsCache.value = {
      available: counts[NUMBER_STATUS.AVAILABLE] || 0,
      pending: counts[NUMBER_STATUS.PENDING] || 0,
      sold: counts[NUMBER_STATUS.SOLD] || 0,
      timestamp: now
    };
    
    return {
      available: statsCache.value.available,
      pending: statsCache.value.pending,
      sold: statsCache.value.sold
    };
  };
  
  /**
   * Limpa o cache quando ocorrem alterações significativas
   */
  const invalidateCache = () => {
    numbersCache.value.clear();
    statsCache.value = null;
  };
  
  return {
    isNumberAvailable,
    getNumberStats,
    invalidateCache
  };
});
