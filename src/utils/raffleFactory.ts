import { type RaffleData } from '../services/raffle';

/**
 * Cria um objeto de dados de sorteio padrão
 * @returns Objeto de sorteio com valores padrão
 */
export const createDefaultRaffle = (): RaffleData => {
  // Obter a data atual formatada como YYYY-MM-DD
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];
  
  // Criar novo sorteio com valores padrão atualizados
  return {
    id: '', // ID vazio para novos sorteios
    title: 'Criar Sorteio',
    description: '',
    imageUrl: '',
    raffleDate: formattedDate,
    raffleTime: null, // Campo para horário específico
    price: 1,
    isCompleted: false,
    isActive: false, // Por padrão não é ativo
    winningNumber: null,
    winner: null,
    seller: null,
    createdBy: '', // Adicionar propriedade obrigatória
    visibility: 'private' // Visibilidade padrão
  };
};
