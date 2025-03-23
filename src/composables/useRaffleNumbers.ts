import { ref } from 'vue';
import * as raffleService from '../services/raffle';

export function useRaffleNumbers() {
  const generatedNumbers = ref<string[]>([]);
  const isGenerating = ref(false);
  const error = ref<string | null>(null);
  
  // Quantidade de números a serem gerados por pedido
  const numbersPerOrder = ref(5);
  
  // Total de números disponíveis
  const totalAvailableNumbers = 100000;
  
  // Gera números únicos para um novo pedido
  const generateUniqueNumbers = async () => {
    isGenerating.value = true;
    error.value = null;
    generatedNumbers.value = [];
    
    try {
      // Busca números já vendidos usando o serviço
      const soldNumbers = await raffleService.fetchSoldNumbers();
      const uniqueNumbers: string[] = [];
      
      // Tenta encontrar números únicos
      let attempts = 0;
      const maxAttempts = numbersPerOrder.value * 10;
      
      while (uniqueNumbers.length < numbersPerOrder.value && attempts < maxAttempts) {
        const newNumber = raffleService.generateFormattedNumber(totalAvailableNumbers);
        
        if (!soldNumbers.includes(newNumber) && !uniqueNumbers.includes(newNumber)) {
          uniqueNumbers.push(newNumber);
        }
        
        attempts++;
      }
      
      if (uniqueNumbers.length < numbersPerOrder.value) {
        throw new Error('Não foi possível gerar todos os números únicos necessários.');
      }
      
      generatedNumbers.value = uniqueNumbers;
    } catch (err: any) {
      console.error('Erro ao gerar números:', err);
      error.value = err.message || 'Erro ao gerar números para o sorteio.';
    } finally {
      isGenerating.value = false;
    }
  };
  
  return {
    generatedNumbers,
    isGenerating,
    error,
    numbersPerOrder,
    generateUniqueNumbers,
  };
}
