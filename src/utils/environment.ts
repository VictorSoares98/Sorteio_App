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
 * Verifica se deve usar o emulador
 */
export const shouldUseEmulator = (): boolean => {
  return import.meta.env.VITE_USE_EMULATOR === 'true';
};

/**
 * Retorna o prefixo para coleções do Firestore baseado no ambiente
 */
export const getCollectionPrefix = (): string => {
  return import.meta.env.VITE_COLLECTION_PREFIX || '';
};

/**
 * Retorna host do emulador do Firestore
 */
export const getFirestoreEmulatorHost = (): string | null => {
  return import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || null;
};

/**
 * Retorna host do emulador de autenticação
 */
export const getAuthEmulatorHost = (): string | null => {
  return import.meta.env.VITE_AUTH_EMULATOR_HOST || null;
};

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
