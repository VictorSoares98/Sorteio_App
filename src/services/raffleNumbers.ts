import { collection, getDocs, query, where, doc, deleteDoc, Timestamp, writeBatch, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import type { NumberReservation } from '../types/order';

// Constante para tempo de expiração de reservas (em ms)
const RESERVATION_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutos

/**
 * Gera um ID de sessão único para o processo de geração atual
 */
const generateSessionId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

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
 * Busca todos os números atualmente reservados (não expirados)
 */
export const fetchReservedNumbers = async (): Promise<string[]> => {
  try {
    const now = new Date();
    const reservationsRef = collection(db, 'number_reservations');
    const reservationsQuery = query(
      reservationsRef, 
      where('expiresAt', '>', now)
    );
    
    const reservationsSnapshot = await getDocs(reservationsQuery);
    const reservedNumbers: string[] = [];
    
    reservationsSnapshot.forEach((doc) => {
      const reservation = doc.data();
      reservedNumbers.push(reservation.number);
    });
    
    return reservedNumbers;
  } catch (err) {
    console.error('Erro ao buscar números reservados:', err);
    throw new Error('Não foi possível verificar os números reservados.');
  }
};

/**
 * Limpa reservas de números expiradas
 */
export const cleanupExpiredReservations = async (): Promise<void> => {
  try {
    const now = new Date();
    const reservationsRef = collection(db, 'number_reservations');
    const expiredQuery = query(
      reservationsRef,
      where('expiresAt', '<', now)
    );
    
    const expiredSnapshot = await getDocs(expiredQuery);
    
    if (expiredSnapshot.empty) return;
    
    // Usar batch para excluir múltiplos documentos de uma vez
    const batch = writeBatch(db);
    
    expiredSnapshot.forEach((docSnapshot) => {
      batch.delete(docSnapshot.ref);
    });
    
    await batch.commit();
    console.log(`Limpeza: ${expiredSnapshot.size} reservas expiradas removidas`);
  } catch (err) {
    console.error('Erro ao limpar reservas expiradas:', err);
  }
};

/**
 * Reserva temporariamente um número no Firestore usando transaction para garantir atomicidade
 */
export const reserveNumber = async (number: string, sessionId: string): Promise<boolean> => {
  try {
    return await runTransaction(db, async (transaction) => {
      // ID do documento será o próprio número para facilitar verificações
      const reservationRef = doc(db, 'number_reservations', number);
      
      // Ler o documento dentro da transaction para garantir atomicidade
      const reservationDoc = await transaction.get(reservationRef);
      
      if (reservationDoc.exists()) {
        // Verificar se a reserva existente já expirou
        const data = reservationDoc.data();
        const expiresAt = data.expiresAt.toDate();
        
        if (expiresAt > new Date()) {
          // Reserva ainda é válida, não podemos reservar este número
          return false;
        }
        // Se expirou, podemos sobrescrever
      }
      
      const now = new Date();
      const expiresAt = new Date(now.getTime() + RESERVATION_EXPIRY_TIME);
      
      // Criar objeto de reserva explicitamente tipado com a interface
      const reservation: NumberReservation = {
        number,
        reservedAt: now,
        expiresAt,
        sessionId
      };
      
      // Criar documento de reserva dentro da transaction
      transaction.set(reservationRef, {
        ...reservation,
        reservedAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt)
      });
      
      return true;
    });
  } catch (err) {
    console.error('Erro ao reservar número:', err);
    return false;
  }
};

/**
 * Remove uma reserva temporária de número
 */
export const removeReservation = async (number: string): Promise<void> => {
  try {
    const reservationRef = doc(db, 'number_reservations', number);
    await deleteDoc(reservationRef);
  } catch (err) {
    console.error('Erro ao remover reserva:', err);
  }
};

/**
 * Gera um número formatado com zeros à esquerda
 * @param totalNumbers Total de números disponíveis
 */
export const generateFormattedNumber = (totalNumbers = 99999): string => {
  // Certifique-se de limitar a faixa a números de 1 a 99999
  const randomNum = Math.floor(Math.random() * totalNumbers) + 1;
  return randomNum.toString().padStart(5, '0');
};

/**
 * Verifica se um número está disponível
 */
export const isNumberAvailable = async (number: string): Promise<boolean> => {
  // Limpar reservas expiradas primeiro para não bloquear números desnecessariamente
  await cleanupExpiredReservations();
  
  // Verificar se o número já foi vendido
  const soldNumbers = await fetchSoldNumbers();
  if (soldNumbers.includes(number)) {
    return false;
  }
  
  // Verificar se o número está reservado
  const reservedNumbers = await fetchReservedNumbers();
  return !reservedNumbers.includes(number);
};

/**
 * Gera múltiplos números únicos com reserva atômica
 * @param count Quantidade de números a gerar
 */
export const generateUniqueNumbers = async (count: number): Promise<string[]> => {
  // Limpar reservas expiradas para não bloquear números desnecessariamente
  await cleanupExpiredReservations();
  
  // Buscar números já vendidos e reservados
  const [soldNumbers, reservedNumbers] = await Promise.all([
    fetchSoldNumbers(),
    fetchReservedNumbers()
  ]);
  
  // Combinar números indisponíveis
  const unavailableNumbers = new Set([...soldNumbers, ...reservedNumbers]);
  
  // Criar ID de sessão único para este processo de geração
  const sessionId = generateSessionId();
  
  const uniqueNumbers: string[] = [];
  const reservedInSession: string[] = [];
  
  // Tentar reservar números únicos
  let attempts = 0;
  const maxAttempts = count * 30; // Aumentado para dar mais chances
  
  try {
    while (uniqueNumbers.length < count && attempts < maxAttempts) {
      const newNumber = generateFormattedNumber();
      
      // Verificar se o número já está na lista de indisponíveis
      if (!unavailableNumbers.has(newNumber) && 
          !uniqueNumbers.includes(newNumber) &&
          !reservedInSession.includes(newNumber)) {
        
        // Tentar reservar o número no Firestore
        const reserved = await reserveNumber(newNumber, sessionId);
        
        if (reserved) {
          // Adicionar à lista de reservas desta sessão
          reservedInSession.push(newNumber);
          // Adicionar à lista de números únicos para retornar
          uniqueNumbers.push(newNumber);
          // Adicionar ao conjunto de indisponíveis para evitar tentar novamente
          unavailableNumbers.add(newNumber);
        }
      }
      
      attempts++;
    }
    
    // Verificar se conseguimos todos os números necessários
    if (uniqueNumbers.length < count) {
      // Se não conseguirmos todos os números, vamos limpar as reservas que fizemos
      await Promise.all(reservedInSession.map(num => removeReservation(num)));
      throw new Error(`Não foi possível gerar ${count} números únicos.`);
    }
    
    return uniqueNumbers;
  } catch (error) {
    // Em caso de erro, garantir que limpamos as reservas
    console.error('Erro ao gerar números únicos:', error);
    
    // Tentar limpar todas as reservas desta sessão
    await Promise.all(reservedInSession.map(num => removeReservation(num)));
    
    throw error;
  }
};

/**
 * Confirma os números reservados após criar um pedido com sucesso
 * (Libera as reservas para que os números não apareçam como reservados e vendidos)
 */
export const confirmNumbersUsed = async (numbers: string[]): Promise<void> => {
  try {
    // Remove as reservas dos números que foram efetivamente usados
    await Promise.all(numbers.map(num => removeReservation(num)));
  } catch (error) {
    console.error('Erro ao confirmar uso de números:', error);
  }
};
