/**
 * Serviço para armazenamento em cache de relatórios
 * Otimizado para reduzir chamadas ao Firestore no plano Spark
 */

// Tipo para os dados em cache
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Verificar se localStorage está disponível
const isStorageAvailable = (): boolean => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

// Namespace para os relatórios em cache
const CACHE_NAMESPACE = 'umadrimc_report_cache_';

// Tempo padrão de expiração (24 horas em milissegundos)
const DEFAULT_EXPIRATION = 24 * 60 * 60 * 1000;

/**
 * Salva dados em cache com uma chave específica
 * @param key Chave única para os dados
 * @param data Dados a serem armazenados 
 * @param expirationMs Tempo de expiração em milissegundos
 */
export const saveToCache = <T>(key: string, data: T, expirationMs = DEFAULT_EXPIRATION): boolean => {
  if (!isStorageAvailable()) return false;
  
  try {
    const now = Date.now();
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: now,
      expiresAt: now + expirationMs
    };
    
    localStorage.setItem(`${CACHE_NAMESPACE}${key}`, JSON.stringify(cacheItem));
    return true;
  } catch (error) {
    console.warn('[ReportCache] Erro ao salvar em cache:', error);
    return false;
  }
};

/**
 * Recupera dados do cache se ainda forem válidos
 * @param key Chave única dos dados
 * @returns Dados do cache ou null se expirados/inexistentes
 */
export const getFromCache = <T>(key: string): T | null => {
  if (!isStorageAvailable()) return null;
  
  try {
    const cached = localStorage.getItem(`${CACHE_NAMESPACE}${key}`);
    if (!cached) return null;
    
    const cacheItem = JSON.parse(cached) as CacheItem<T>;
    
    // Verificar se o cache expirou
    if (Date.now() > cacheItem.expiresAt) {
      localStorage.removeItem(`${CACHE_NAMESPACE}${key}`);
      return null;
    }
    
    return cacheItem.data;
  } catch (error) {
    console.warn('[ReportCache] Erro ao recuperar do cache:', error);
    return null;
  }
};

/**
 * Limpa todos os caches de relatórios
 */
export const clearAllCaches = (): void => {
  if (!isStorageAvailable()) return;
  
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_NAMESPACE)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('[ReportCache] Erro ao limpar caches:', error);
  }
};

/**
 * Verifica se existe um cache válido para uma chave
 * @param key Chave do cache
 * @returns true se existe um cache válido
 */
export const hasCachedData = (key: string): boolean => {
  return getFromCache(key) !== null;
};
