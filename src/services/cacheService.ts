/**
 * Serviço de cache para otimizar consultas ao Firestore
 * Reduz consultas repetidas e melhora o desempenho geral do aplicativo
 */

// Cache com tempo de expiração
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

class CacheService {
  private cache: Map<string, CacheItem<any>> = new Map();
  private DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos de TTL padrão

  /**
   * Obtém um item do cache se existir e não estiver expirado
   */
  get<T>(key: string, ttl: number = this.DEFAULT_TTL): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > ttl) {
      // Item expirado, remover do cache
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Armazena um item no cache
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Remove um item específico do cache
   */
  remove(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalida todos os itens do cache que contenham uma determinada string no nome da chave
   */
  invalidateByPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Retorna uma função que busca dados da função original apenas se não estiverem em cache
   * Ideal para funções que executam consultas caras
   */
  async cachedFetch<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Verificar se os dados já estão em cache
    const cachedData = this.get<T>(key, ttl);
    if (cachedData !== null) {
      console.log(`[Cache] Usando dados em cache para: ${key}`);
      return cachedData;
    }

    // Se não estiverem em cache, buscar novos dados
    console.log(`[Cache] Buscando novos dados para: ${key}`);
    const data = await fetchFunction();
    
    // Armazenar no cache para uso futuro
    this.set(key, data);
    
    return data;
  }
}

// Exportar uma única instância para ser usada em toda a aplicação
export const cacheService = new CacheService();
