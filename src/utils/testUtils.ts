import { enableMockData, setMockData, clearAllMockData } from '../services/collectionService';
import { isOnline, isServiceBlocked } from '../services/connectivity';

// Re-export setMockData for use in tests
export { setMockData };

/**
 * Configura o ambiente de testes para usar dados simulados
 * Deve ser chamado no beforeEach dos testes
 * 
 * @example
 * beforeEach(() => {
 *   setupTestEnvironment();
 *   
 *   // Configurar dados simulados
 *   setMockData('users', {
 *     'user1': { id: 'user1', name: 'Usuário Teste', email: 'teste@example.com' }
 *   });
 * });
 * 
 * afterEach(() => {
 *   cleanupTestEnvironment();
 * });
 */
export function setupTestEnvironment(): void {
  enableMockData(true);
}

/**
 * Limpa o ambiente de testes
 * Deve ser chamado no afterEach dos testes
 */
export function cleanupTestEnvironment(): void {
  clearAllMockData();
  enableMockData(false);
}

/**
 * Simula o estado de conectividade online/offline.
 * 
 * @param online Define se o sistema deve estar online (true) ou offline (false).
 */
export function simulateConnectivity(online: boolean): void {
  isOnline.value = online;
}

/**
 * Simula o bloqueio de serviços externos, como Firestore.
 * 
 * @param blocked Define se os serviços devem ser bloqueados (true) ou desbloqueados (false).
 */
export function simulateServiceBlocking(blocked: boolean): void {
  isServiceBlocked.value = blocked;
}
