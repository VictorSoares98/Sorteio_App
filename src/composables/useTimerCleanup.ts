import { ref, onBeforeUnmount } from 'vue';

/**
 * Composable para gerenciar e limpar automaticamente timers (setTimeout e setInterval)
 * quando o componente for desmontado
 */
export function useTimerCleanup() {
  // Arrays para armazenar IDs de timers
  const timeoutIds = ref<number[]>([]);
  const intervalIds = ref<number[]>([]);
  
  /**
   * Cria um setTimeout gerenciado que será limpo automaticamente
   * @param callback Função a ser executada
   * @param ms Tempo de espera em milissegundos
   * @returns ID do timeout
   */
  const setTimeout = (callback: Function, ms: number): number => {
    const id = window.setTimeout(() => {
      // Remover o ID da lista quando o timeout for executado
      timeoutIds.value = timeoutIds.value.filter(timeoutId => timeoutId !== id);
      callback();
    }, ms);
    
    // Adicionar o ID à lista para limpeza posterior
    timeoutIds.value.push(id);
    return id;
  };
  
  /**
   * Cria um setInterval gerenciado que será limpo automaticamente
   * @param callback Função a ser executada
   * @param ms Intervalo em milissegundos
   * @returns ID do interval
   */
  const setInterval = (callback: Function, ms: number): number => {
    const id = window.setInterval(callback, ms);
    intervalIds.value.push(id);
    return id;
  };
  
  /**
   * Limpa um timeout específico e o remove da lista
   * @param id ID do timeout a ser limpo
   */
  const clearTimeout = (id: number): void => {
    window.clearTimeout(id);
    timeoutIds.value = timeoutIds.value.filter(timeoutId => timeoutId !== id);
  };
  
  /**
   * Limpa um interval específico e o remove da lista
   * @param id ID do interval a ser limpo
   */
  const clearInterval = (id: number): void => {
    window.clearInterval(id);
    intervalIds.value = intervalIds.value.filter(intervalId => intervalId !== id);
  };
  
  /**
   * Limpa todos os timeouts registrados
   */
  const clearAllTimeouts = (): void => {
    timeoutIds.value.forEach(id => window.clearTimeout(id));
    timeoutIds.value = [];
  };
  
  /**
   * Limpa todos os intervals registrados
   */
  const clearAllIntervals = (): void => {
    intervalIds.value.forEach(id => window.clearInterval(id));
    intervalIds.value = [];
  };
  
  /**
   * Limpa todos os timers (timeouts e intervals)
   */
  const clearAllTimers = (): void => {
    clearAllTimeouts();
    clearAllIntervals();
  };
  
  // Limpar automaticamente todos os timers quando o componente for desmontado
  onBeforeUnmount(() => {
    clearAllTimers();
  });
  
  return {
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    clearAllTimeouts,
    clearAllIntervals,
    clearAllTimers,
    timeoutIds,
    intervalIds
  };
}
