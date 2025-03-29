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
});