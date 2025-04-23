import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Button from './Button.vue';

describe('Button.vue', () => {
  it('renderiza o texto do slot corretamente', () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Clique aqui'
      }
    });
    expect(wrapper.text()).toBe('Clique aqui');
  });

  it('emite evento click quando clicado', async () => {
    const wrapper = mount(Button);
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
  });

  it('não emite evento click quando está desabilitado', async () => {
    const wrapper = mount(Button, {
      props: {
        disabled: true
      }
    });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeFalsy();
  });

  it('não emite evento click quando está carregando', async () => {
    const wrapper = mount(Button, {
      props: {
        loading: true
      }
    });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeFalsy();
  });

  it('aplica as classes corretas com base nas props', () => {
    const wrapper = mount(Button, {
      props: {
        variant: 'danger',
        size: 'lg',
        block: true
      }
    });
    expect(wrapper.classes()).toContain('btn-danger');
    expect(wrapper.classes()).toContain('btn-lg');
    expect(wrapper.classes()).toContain('w-full');
  });

  // Novos testes visuais
  it('renderiza corretamente o estado de carregamento', () => {
    const wrapper = mount(Button, {
      props: {
        loading: true
      },
      slots: {
        default: 'Processando'
      }
    });

    expect(wrapper.find('.animate-spin').exists()).toBe(true);
    expect(wrapper.text()).toContain('Processando');
    expect(wrapper.html()).toMatchSnapshot('button-loading');
  });

  it('renderiza diferentes variantes visuais corretamente', () => {
    const variants = ['primary', 'outline', 'danger'];
    const snapshots: Record<string, string> = {};
    
    for (const variant of variants) {
      const wrapper = mount(Button, {
        props: { variant: variant as any },
        slots: { default: `Botão ${variant}` }
      });
      
      expect(wrapper.classes()).toContain(`btn-${variant}`);
      snapshots[variant] = wrapper.html();
    }
    
    expect(snapshots).toMatchSnapshot('button-variants');
  });
});