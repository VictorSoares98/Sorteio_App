import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Card from './Card.vue';

describe('Card.vue', () => {
  it('renderiza o título quando fornecido', () => {
    const wrapper = mount(Card, {
      props: {
        title: 'Título do Card'
      },
      slots: {
        default: 'Conteúdo do card'
      }
    });
    expect(wrapper.find('.card-title').text()).toBe('Título do Card');
    expect(wrapper.text()).toContain('Conteúdo do card');
    expect(wrapper.html()).toMatchSnapshot('card-with-title');
  });

  it('renderiza apenas o conteúdo sem título', () => {
    const wrapper = mount(Card, {
      slots: {
        default: 'Apenas conteúdo'
      }
    });
    expect(wrapper.find('.card-title').exists()).toBe(false);
    expect(wrapper.text()).toContain('Apenas conteúdo');
    expect(wrapper.html()).toMatchSnapshot('card-without-title');
  });

  it('aplica classes personalizadas quando fornecidas', () => {
    const wrapper = mount(Card, {
      props: {
        title: 'Card com Classes',
        titleClass: 'text-primary font-bold',
        bodyClass: 'bg-gray-100',
        class: 'border-primary'
      },
      slots: {
        default: 'Conteúdo com classes personalizadas'
      }
    });
    
    expect(wrapper.find('.card-title').classes()).toContain('text-primary');
    expect(wrapper.find('.card-title').classes()).toContain('font-bold');
    expect(wrapper.find('.card-body').classes()).toContain('bg-gray-100');
    expect(wrapper.classes()).toContain('border-primary');
    expect(wrapper.html()).toMatchSnapshot('card-with-custom-classes');
  });
});
