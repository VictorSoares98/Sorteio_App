import { ref } from 'vue';
import * as raffleService from '../services/raffleNumbers';

export function useRaffleNumbers() {
  const generatedNumbers = ref<string[]>([]);
  const isGenerating = ref(false);
  const error = ref<string | null>(null);
  
  // Quantidade de números a serem gerados por pedido
  const numbersPerOrder = ref(5);
  
  // Gera números únicos para um novo pedido
  const generateUniqueNumbers = async () => {
    isGenerating.value = true;
    error.value = null;
    generatedNumbers.value = [];
    
    try {
      // Usando o serviço atualizado para gerar números com reserva
      const numbers = await raffleService.generateUniqueNumbers(numbersPerOrder.value);
      generatedNumbers.value = numbers;
      
    } catch (err: any) {
      console.error('Erro ao gerar números:', err);
      error.value = err.message || 'Erro ao gerar números para o sorteio.';
      generatedNumbers.value = []; // Limpar números gerados em caso de erro
    } finally {
      isGenerating.value = false;
    }
  };
  
  // Confirma o uso dos números após criar o pedido com sucesso
  const confirmNumbersUsed = async () => {
    if (generatedNumbers.value.length === 0) return;
    
    try {
      await raffleService.confirmNumbersUsed(generatedNumbers.value);
    } catch (err) {
      console.error('Erro ao confirmar uso dos números:', err);
    }
  };
  
  return {
    generatedNumbers,
    isGenerating,
    error,
    numbersPerOrder,
    generateUniqueNumbers,
    confirmNumbersUsed, // Nova função para confirmar uso dos números
  };
}
