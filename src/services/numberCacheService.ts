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
  const numbersCache = ref<Map<string, { status: string, timestamp: number, local?: boolean }>>(new Map());
  
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
      available: counts.availableCount || 0,
      pending: counts.reservedCount || 0,
      sold: counts.soldCount || 0,
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

  /**
   * Atualiza o cache local com números específicos marcados como indisponíveis
   * Útil para modo offline quando temos operações pendentes
   */
  const updateLocalCache = (numbers: string[]) => {
    const now = Date.now();
    
    // Marcar estes números como indisponíveis no cache local
    numbers.forEach(number => {
      numbersCache.value.set(number, {
        status: NUMBER_STATUS.PENDING, // Usar PENDING para operações locais não confirmadas
        timestamp: now,
        local: true // Flag para indicar que esta é uma entrada local não confirmada
      });
    });
    
    // Também atualizar estatísticas de cache
    if (statsCache.value) {
      // Assumir conservadoramente que todos são vendas pendentes
      statsCache.value = {
        ...statsCache.value,
        available: Math.max(0, statsCache.value.available - numbers.length),
        pending: statsCache.value.pending + numbers.length,
        timestamp: now
      };
    }
    
    console.log(`[NumberCache] Cache local atualizado com ${numbers.length} números marcados como pendentes`);
    
    // Agendar reconciliação com o servidor
    setTimeout(() => reconcileCacheWithServer(numbers), 5000); // 5 segundos de atraso
  };

  /**
   * Reconciliar o cache local com o estado do servidor
   */
  const reconcileCacheWithServer = async (numbers: string[]) => {
    try {
      const now = Date.now();
      for (const number of numbers) {
        const status = await getNumberStatus(number);
        numbersCache.value.set(number, {
          status: status?.status || NUMBER_STATUS.AVAILABLE,
          timestamp: now
        });
      }
      console.log(`[NumberCache] Cache reconciliado com o servidor para ${numbers.length} números`);
    } catch (error) {
      console.error('[NumberCache] Falha ao reconciliar cache com o servidor:', error);
    }
  };
  
  return {
    isNumberAvailable,
    getNumberStats,
    invalidateCache,
    updateLocalCache // Adicionar o novo método
  };
});
