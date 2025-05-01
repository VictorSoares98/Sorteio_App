/**
 * Utilitário para gerenciar configurações de ambiente
 */

/**
 * Retorna o ambiente atual com base nas variáveis Vite
 */
export const getCurrentEnvironment = (): 'development' | 'test' | 'production' => {
  return (import.meta.env.VITE_FIREBASE_ENV as 'development' | 'test' | 'production') || 'production';
};

/**
 * Verifica se o emulador do Firebase está ativo
 * @returns true se o emulador deve ser usado
 */
export function shouldUseEmulator(): boolean {
  // Verificar variáveis de ambiente
  const explicitEnableEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
  const explicitDisableEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'false';
  
  // Se explicitamente definido, respeitar a configuração
  if (explicitEnableEmulator) return true;
  if (explicitDisableEmulator) return false;
  
  // Verificar se FIREBASE_EMULATOR_URL está definido como variável de ambiente
  // Isso seria definido automaticamente se os emuladores estiverem em execução
  const emulatorHostEnv = import.meta.env.VITE_FIREBASE_EMULATOR_URL;
  if (emulatorHostEnv) return true;
  
  // Caso contrário, usar emulador apenas em ambiente de desenvolvimento local
  // mas precisamos verificar se ele está realmente rodando 
  const isDev = getCurrentEnvironment() === 'development';
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
                     
  // Em desenvolvimento local, vai tentar verificar se os emuladores estão rodando
  return isDev && isLocalhost;
}

/**
 * Verifica se um emulador específico está rodando
 * @param host Hostname e porta do emulador
 * @returns Promise que resolve para true se o emulador estiver acessível
 */
export async function isEmulatorRunning(host: string): Promise<boolean> {
  try {
    const response = await fetch(`http://${host}/.json`, { 
      method: 'HEAD',
      // Tempo curto para não bloquear a inicialização
      signal: AbortSignal.timeout(500)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Retorna o prefixo para coleções do Firestore baseado no ambiente
 */
export const getCollectionPrefix = (): string => {
  return import.meta.env.VITE_COLLECTION_PREFIX || '';
};

/**
 * Obtém o host do emulador do Firestore
 * @returns host:port ou undefined
 */
export function getFirestoreEmulatorHost(): string | null {
  return import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || 'localhost:8080';
}

/**
 * Obtém o host do emulador do Auth
 * @returns host:port ou undefined
 */
export function getAuthEmulatorHost(): string | null {
  return import.meta.env.VITE_AUTH_EMULATOR_HOST || 'localhost:9099';
}

/**
 * Verifica se está em modo de desenvolvimento
 */
export const isDevelopment = (): boolean => {
  return getCurrentEnvironment() === 'development';
};

/**
 * Verifica se está em modo de teste
 */
export const isTest = (): boolean => {
  return getCurrentEnvironment() === 'test';
};

/**
 * Verifica se está em ambiente de produção
 */
export const isProduction = (): boolean => {
  return getCurrentEnvironment() === 'production';
};
