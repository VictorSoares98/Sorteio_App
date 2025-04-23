# Testes de Views

Esta pasta contém testes específicos para as views da aplicação.

## Estrutura

Os testes para views são organizados da seguinte forma:

- **Testes unitários**: Arquivos `.test.ts` co-localizados com a view
- **Testes de integração**: Arquivos `.spec.ts` nesta pasta `__tests__`
- **Testes E2E**: Arquivos `.e2e.ts` nesta pasta `__tests__`

As views geralmente contêm vários componentes e lógica de roteamento, portanto os testes aqui tendem a ser mais abrangentes e focados em interações entre componentes e fluxos de usuário.

## Exemplos

### Teste unitário
```typescript
// HomeView.test.ts
import { mount } from '@vue/test-utils';
import HomeView from '../HomeView.vue';
import { createTestingPinia } from '@pinia/testing';

describe('HomeView.vue', () => {
  it('renderiza o componente corretamente', () => {
    const wrapper = mount(HomeView, {
      global: {
        plugins: [createTestingPinia()]
      }
    });
    expect(wrapper.find('h1').text()).toContain('Formulário de Pedidos');
  });
});
```

### Teste E2E
```typescript
// HomeView.e2e.ts
import { mount } from '@vue/test-utils';
import HomeView from '../../HomeView.vue';
import { createTestingPinia } from '@pinia/testing';
import { useAuthStore } from '../../../stores/authStore';
import { useOrderStore } from '../../../stores/orderStore';
import { simulateUser } from '../../../../__tests__/helpers/userInteraction';

describe('HomeView.vue (E2E)', () => {
  it('permite ao usuário criar um pedido completo', async () => {
    const wrapper = mount(HomeView, {
      global: {
        plugins: [createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            auth: { isAuthenticated: true, currentUser: { id: 'user1', displayName: 'Usuário Teste' } }
          }
        })]
      }
    });
    
    // Simular interações do usuário
    await simulateUser.fillForm(wrapper, {
      number: '12345',
      name: 'Cliente Teste',
      phone: '(21) 99999-9999'
    });
    
    await simulateUser.clickSubmit(wrapper);
    
    // Verificar se o pedido foi criado
    const orderStore = useOrderStore();
    expect(orderStore.createOrder).toHaveBeenCalled();
  });
});
```
