import { ref, onMounted } from 'vue';
import * as raffleService from '../services/raffleNumbers';

export function useRaffleNumbers() {
  const generatedNumbers = ref<string[]>([]);
  const isGenerating = ref(false);
  const error = ref<string | null>(null);
  const isSystemInitialized = ref(false);
  const isInitializing = ref(false);
  
  // Quantidade de números a serem gerados por pedido
  const numbersPerOrder = ref(5);
  
  // Inicializar o sistema de números se necessário
  const initializeNumberSystem = async (force = false) => {
    if (isSystemInitialized.value && !force) return;
    
    try {
      isInitializing.value = true;
      // Inicializar coleção de números disponíveis se não existir
      await raffleService.initAvailableNumbersCollection();
      // Sincronizar com números já vendidos
      await raffleService.syncAvailableNumbersWithSoldOnes();
      isSystemInitialized.value = true;
    } catch (err: any) {
      console.error('Erro ao inicializar sistema de números:', err);
      error.value = 'Erro ao configurar sistema. Entre em contato com o suporte.';
    } finally {
      isInitializing.value = false;
    }
  };
  
  // Gera números únicos para um novo pedido
  const generateUniqueNumbers = async () => {
    isGenerating.value = true;
    error.value = null;
    generatedNumbers.value = [];
    
    try {
      // Garantir que o sistema está inicializado
      if (!isSystemInitialized.value) {
        await initializeNumberSystem();
      }
      
      // Usando o serviço atualizado para gerar números
      const numbers = await raffleService.generateUniqueNumbers(numbersPerOrder.value);
      generatedNumbers.value = numbers;
      
    } catch (err: any) {
      console.error('Erro ao gerar números:', err);
      error.value = err.message || 'Erro ao gerar números para o sorteio.';
      generatedNumbers.value = []; // Limpar números gerados em caso de erro
      
      // Se o erro for relacionado à inicialização, tentar inicializar novamente
      if (err.message.includes('inicializada') || 
          err.message.includes('disponível')) {
        await initializeNumberSystem(true);
      }
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
  
  // Inicializar sistema quando o componente é montado
  onMounted(() => {
    initializeNumberSystem();
  });
  
  return {
    generatedNumbers,
    isGenerating,
    error,
    numbersPerOrder,
    isInitializing,
    isSystemInitialized,
    generateUniqueNumbers,
    confirmNumbersUsed,
    initializeNumberSystem
  };
}
