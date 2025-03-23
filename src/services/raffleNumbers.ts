import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Busca todos os números já vendidos no Firestore
 */
export const fetchSoldNumbers = async (): Promise<string[]> => {
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

/**
 * Gera um número formatado com zeros à esquerda
 * @param totalNumbers Total de números disponíveis
 */
export const generateFormattedNumber = (totalNumbers = 100000): string => {
  const randomNum = Math.floor(Math.random() * totalNumbers);
  return randomNum.toString().padStart(5, '0');
};

/**
 * Verifica se um número está disponível
 */
export const isNumberAvailable = async (number: string): Promise<boolean> => {
  const soldNumbers = await fetchSoldNumbers();
  return !soldNumbers.includes(number);
};

/**
 * Gera múltiplos números únicos
 * @param count Quantidade de números a gerar
 * @param totalNumbers Total de números disponíveis
 */
export const generateUniqueNumbers = async (count: number, totalNumbers = 100000): Promise<string[]> => {
  const soldNumbers = await fetchSoldNumbers();
  const uniqueNumbers: string[] = [];
  
  let attempts = 0;
  const maxAttempts = count * 20; // Limite de tentativas
  
  while (uniqueNumbers.length < count && attempts < maxAttempts) {
    const newNumber = generateFormattedNumber(totalNumbers);
    
    if (!soldNumbers.includes(newNumber) && !uniqueNumbers.includes(newNumber)) {
      uniqueNumbers.push(newNumber);
    }
    
    attempts++;
  }
  
  if (uniqueNumbers.length < count) {
    throw new Error(`Não foi possível gerar ${count} números únicos.`);
  }
  
  return uniqueNumbers;
};
