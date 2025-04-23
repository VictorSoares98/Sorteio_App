# Testes de Componentes

Esta pasta contém testes adicionais para os componentes da aplicação.

## Estrutura

Cada componente pode ter testes co-localizados no mesmo diretório do componente (exemplo: `ComponentName.test.ts`) ou em uma pasta `__tests__` própria no diretório do componente.

Para testes mais complexos, como testes de integração ou visuais, você deve criar arquivos nessa pasta seguindo a convenção:

- **Unitários adicionais**: `ComponentName.test.ts`
- **Integração**: `ComponentName.spec.ts`
- **Visuais**: `ComponentName.visual.ts`

## Exemplos

### Teste unitário
```typescript
// Button.test.ts
import { mount } from '@vue/test-utils';
import Button from '../Button.vue';

describe('Button.vue', () => {
  it('renderiza o conteúdo corretamente', () => {
    const wrapper = mount(Button, {
      slots: { default: 'Botão de Teste' }
    });
    expect(wrapper.text()).toContain('Botão de Teste');
  });
});
```

### Teste visual
```typescript
// Button.visual.ts
import { mount } from '@vue/test-utils';
import Button from '../Button.vue';

describe('Button.vue (Visual)', () => {
  it('renderiza corretamente em diferentes estados', () => {
    const states = ['default', 'hover', 'active', 'disabled'];
    const snapshots = {};
    
    for (const state of states) {
      const wrapper = mount(Button, {
        props: { state },
        slots: { default: `Botão ${state}` }
      });
      snapshots[state] = wrapper.html();
    }
    
    expect(snapshots).toMatchSnapshot('button-states');
  });
});
```
