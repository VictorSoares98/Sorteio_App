import type { RaffleData } from '../services/raffle';

/**
 * Cria um objeto de sorteio padrão com valores iniciais
 * @param customProps Propriedades customizadas para substituir os valores padrão
 * @returns Um objeto RaffleData com valores padrão
 */
export const createDefaultRaffle = (customProps: Partial<RaffleData> = {}): RaffleData => {
  return {
    id: 'current_raffle',
    title: 'Sorteio',
    imageUrl: 'https://via.placeholder.com/600x400?text=Item+do+Sorteio',
    description: 'Participe do nosso sorteio beneficente e concorra a prêmios incríveis!',
    raffleDate: new Date().toISOString().split('T')[0], // Data atual formatada como YYYY-MM-DD
    price: 10.00,
    isCompleted: false,
    winningNumber: null,
    winner: null,
    seller: null,
    ...customProps
  };
};
