import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import RaffleDisplay from './RaffleDisplay.vue';
import { createDefaultRaffle } from '../../utils/raffleFactory';
import { setViewportSize, viewports } from '../../utils/vitest-setup';

describe('RaffleDisplay.vue', () => {
  // Configuração padrão do componente para testes
  const defaultMountOptions = {
    props: {
      raffleData: {
        ...createDefaultRaffle(),
        title: 'Sorteio de Teste',
        description: 'Descrição do sorteio para teste visual',
        price: 10,
        raffleDate: '2024-12-31',
        winningNumber: undefined // Explicitly set to undefined instead of null
      }
    },
    global: {
      stubs: {
        'router-link': true
      }
    }
  };

  // Restaurar o tamanho da janela após cada teste
  beforeEach(() => {
    setViewportSize(viewports.desktop.width, viewports.desktop.height);
  });

  it('renderiza corretamente com dados padrão', () => {
    const wrapper = mount(RaffleDisplay, defaultMountOptions);
    expect(wrapper.find('.raffle-title').text()).toContain('Sorteio de Teste');
    expect(wrapper.find('.raffle-description').exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('exibe placeholder quando não há imagem', () => {
    const wrapper = mount(RaffleDisplay, defaultMountOptions);
    const imagePlaceholder = wrapper.find('.image-placeholder');
    expect(imagePlaceholder.exists()).toBe(true);
  });

  it('ajusta layout para tela mobile', async () => {
    // Simular tela mobile
    setViewportSize(viewports.mobile.width, viewports.mobile.height);
    
    const wrapper = mount(RaffleDisplay, defaultMountOptions);
    await wrapper.vm.$nextTick();
    
    // Capturar snapshot específico para mobile
    expect(wrapper.html()).toMatchSnapshot('mobile-view');
  });

  it('exibe informações do vencedor quando o sorteio está completo', () => {
    const wrapper = mount(RaffleDisplay, {
      props: {
        raffleData: {
          ...defaultMountOptions.props.raffleData,
          isCompleted: true,
          winningNumber: '12345',
          winner: {
            name: 'João Silva',
            phone: '(21) 98765-4321',
            congregation: 'Congregação Central'
          }
        }
      },
      global: defaultMountOptions.global
    });

    expect(wrapper.find('.winner-info').exists()).toBe(true);
    expect(wrapper.text()).toContain('João Silva');
    expect(wrapper.text()).toContain('12345');
    expect(wrapper.html()).toMatchSnapshot('raffle-completed');
  });

  it('renderiza preço do bilhete corretamente formatado', () => {
    const wrapper = mount(RaffleDisplay, defaultMountOptions);
    expect(wrapper.find('.ticket-price').text()).toContain('R$ 10,00');
  });
});
