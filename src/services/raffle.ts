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
