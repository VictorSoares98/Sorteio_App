# Testes de Stores

Esta pasta contém testes específicos para os stores da aplicação.

## Estrutura

Os testes para stores são organizados da seguinte forma:

- **Testes unitários**: Arquivos `.test.ts` co-localizados com o store
- **Testes de integração**: Arquivos `.spec.ts` nesta pasta `__tests__`

## Exemplos

### Teste unitário
```typescript
// authStore.test.ts
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../authStore';
import { vi } from 'vitest';

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('inicia com o usuário não autenticado', () => {
    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(false);
    expect(store.currentUser).toBeNull();
  });
});
```

### Teste de integração
```typescript
// authStore.spec.ts
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../authStore';
import { useOrderStore } from '../../orderStore';
import { vi } from 'vitest';

describe('Auth Store Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('atualiza orderStore quando o usuário faz logout', async () => {
    const authStore = useAuthStore();
    const orderStore = useOrderStore();
    
    // Mock das dependências
    vi.spyOn(orderStore, 'clearOrders');
    
    // Simular logout
    await authStore.logout();
    
    expect(orderStore.clearOrders).toHaveBeenCalled();
  });
});
```
