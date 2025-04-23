import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  setMockData, 
  getMockDocument, 
  clearAllMockData
} from './collectionService';
import { setupTestEnvironment, cleanupTestEnvironment } from '../utils/testUtils';

describe('collectionService', () => {
  
  // Configuração antes de cada teste
  beforeEach(() => {
    setupTestEnvironment();
    
    // Exemplo de dados de teste para usuários
    setMockData('users', {
      'user1': { id: 'user1', name: 'Usuário 1', email: 'user1@example.com' },
      'user2': { id: 'user2', name: 'Usuário 2', email: 'user2@example.com' }
    });
    
    // Exemplo de dados de teste para pedidos
    setMockData('orders', {
      'order1': { id: 'order1', userId: 'user1', amount: 100 }
    });
  });
  
  // Limpeza após cada teste
  afterEach(() => {
    cleanupTestEnvironment();
  });
  
  it('deve recuperar dados simulados corretamente', () => {
    const user1 = getMockDocument('users', 'user1');
    expect(user1).toBeDefined();
    expect(user1?.name).toBe('Usuário 1');
    
    const nonExistentUser = getMockDocument('users', 'user999');
    expect(nonExistentUser).toBeUndefined();
  });
  
  it('deve limpar todos os dados simulados', () => {
    expect(getMockDocument('users', 'user1')).toBeDefined();
    
    clearAllMockData();
    
    expect(getMockDocument('users', 'user1')).toBeUndefined();
  });
});
