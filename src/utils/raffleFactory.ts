import { type RaffleData } from '../services/raffle';

/**
 * Cria um objeto de dados de sorteio padrão
 * @returns Objeto de sorteio com valores padrão
 */
export const createDefaultRaffle = (): RaffleData => {
  // Obter a data atual formatada como YYYY-MM-DD
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];
  
  return {
    id: 'current_raffle',
    title: 'Sorteio Beneficente UMADRIMC',
    description: 'Participe do sorteio beneficente da UMADRIMC. O valor arrecadado será utilizado para investimentos na obra.',
    imageUrl: '',
    raffleDate: formattedDate,
    raffleTime: null, // Novo campo para horário específico
    price: 1,
    isCompleted: false,
    winningNumber: null,
    winner: null,
    seller: null
    // Mantendo todos os campos originais
  };
};
