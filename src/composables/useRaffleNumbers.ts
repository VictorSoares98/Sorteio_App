import { ref, computed } from 'vue';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export function useRaffleNumbers() {
  const generatedNumbers = ref<string[]>([]);
  const isGenerating = ref(false);
  const error = ref<string | null>(null);
  
  // Quantidade de números a serem gerados por pedido (ajustável conforme necessidade)
  const numbersPerOrder = ref(5);
  
  // Total de números disponíveis (baseado no padrão da Loteria Federal)
  const totalAvailableNumbers = 100000; // De 00000 a 99999
  
  // Verifica números já vendidos no Firestore
  const fetchSoldNumbers = async (): Promise<string[]> => {
    try {
      const ordersRef = collection(db, 'orders');
      const ordersSnapshot = await getDocs(ordersRef);
      
      const soldNumbers: string[] = [];
      
      ordersSnapshot.forEach((doc) => {
        const orderData = doc.data();
        if (orderData.generatedNumbers && Array.isArray(orderData.generatedNumbers)) {
          soldNumbers.push(...orderData.generatedNumbers);
        }
      });
      
      return soldNumbers;
    } catch (err) {
      console.error('Erro ao buscar números vendidos:', err);
      throw new Error('Não foi possível verificar os números já vendidos.');
    }
  };
  
  // Gera um número aleatório formatado com zeros à esquerda
  const generateFormattedNumber = (): string => {
    const randomNum = Math.floor(Math.random() * totalAvailableNumbers);
    return randomNum.toString().padStart(5, '0');
  };
  
  // Gera números únicos para um novo pedido
  const generateUniqueNumbers = async () => {
    isGenerating.value = true;
    error.value = null;
    generatedNumbers.value = [];
    
    try {
      // Busca números já vendidos
      const soldNumbers = await fetchSoldNumbers();
      const uniqueNumbers: string[] = [];
      
      // Tenta encontrar números únicos (não vendidos ainda)
      let attempts = 0;
      const maxAttempts = numbersPerOrder.value * 10; // Limite de tentativas para evitar loop infinito
      
      while (uniqueNumbers.length < numbersPerOrder.value && attempts < maxAttempts) {
        const newNumber = generateFormattedNumber();
        
        // Verifica se o número já existe nos vendidos ou nos que acabamos de gerar
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
    // Retornar o ref diretamente para manter compatibilidade
    generatedNumbers,
    isGenerating,
    error,
    numbersPerOrder,
    generateUniqueNumbers,
  };
}
