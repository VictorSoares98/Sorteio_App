import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Alert from './Alert.vue';

// Define the AlertType to match the component's expected type
type AlertType = 'success' | 'error' | 'warning' | 'info';

describe('Alert.vue', () => {
  it('renderiza mensagem corretamente', () => {
    const wrapper = mount(Alert, {
      props: {
        message: 'Mensagem de teste',
        type: 'info'
      }
    });
    expect(wrapper.text()).toContain('Mensagem de teste');
  });
  
  it('aplica classes corretas baseadas no tipo', () => {
    const types: AlertType[] = ['success', 'error', 'warning', 'info'];
    const snapshots: Record<AlertType, string> = {} as Record<AlertType, string>;
    
    for (const type of types) {
      const wrapper = mount(Alert, {
        props: {
          message: `Mensagem de ${type}`,
          type
        }
      });
      
      expect(wrapper.classes()).toContain(`alert-${type}`);
      snapshots[type] = wrapper.html();
    }
    
    expect(snapshots).toMatchSnapshot('alert-types');
  });

  it('emite evento dismiss quando botão de fechar é clicado', async () => {
    const wrapper = mount(Alert, {
      props: {
        message: 'Mensagem de teste',
        type: 'info',
        dismissible: true
      }
    });

    // Verifica se o botão de fechar existe
    const closeButton = wrapper.find('.alert-close');
    expect(closeButton.exists()).toBe(true);

    // Clica no botão
    await closeButton.trigger('click');

    // Verifica se o evento dismiss foi emitido
    expect(wrapper.emitted('dismiss')).toBeTruthy();
  });

  it('não mostra botão de fechar quando dismissible é false', () => {
    const wrapper = mount(Alert, {
      props: {
        message: 'Mensagem de teste',
        type: 'info',
        dismissible: false
      }
    });

    const closeButton = wrapper.find('.alert-close');
    expect(closeButton.exists()).toBe(false);
  });
});
