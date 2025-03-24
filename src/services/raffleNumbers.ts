import { collection, getDocs, query, where, doc, deleteDoc, Timestamp, writeBatch, runTransaction, documentId, limit } from 'firebase/firestore';
import { db } from '../firebase';
import type { NumberReservation } from '../types/order';

// Constante para tempo de expiração de reservas (em ms)
const RESERVATION_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutos
// Limitar quantidade máxima de números por requisição para evitar abuso
const MAX_NUMBERS_PER_REQUEST = 100;
// Adicionar uma camada de segurança com uma semente específica da aplicação
const APP_SEED = 'UMADRIMC-2023';

// Constante para definir o limite máximo de números disponíveis no sistema
const MAX_AVAILABLE_NUMBERS = 10000; // Novo limite de 10.000 números
// Constante para definir o número de dígitos para formatação
const NUMBER_DIGIT_COUNT = 5; // Sempre 5 dígitos

/**
 * Gera um ID de sessão único para o processo de geração atual
 */
const generateSessionId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

/**
 * Cache local para melhorar performance de busca de números
 */
let soldNumbersCache: string[] = [];
let soldNumbersCacheTimestamp = 0;
const CACHE_VALIDITY_MS = 60000; // 1 minuto de validade para o cache

/**
 * Busca todos os números já vendidos no Firestore com suporte a cache
 */
export const fetchSoldNumbers = async (ignoreCache = false): Promise<string[]> => {
  const now = Date.now();
  
  // Se o cache ainda é válido e não estamos forçando refresh, retornar do cache
  if (!ignoreCache && soldNumbersCache.length > 0 && now - soldNumbersCacheTimestamp < CACHE_VALIDITY_MS) {
    console.log(`[PERF] Usando cache de números vendidos (${soldNumbersCache.length} números)`);
    return soldNumbersCache;
  }
  
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
    
    // Atualizar cache
    soldNumbersCache = soldNumbers;
    soldNumbersCacheTimestamp = now;
    
    return soldNumbers;
  } catch (err) {
    console.error('Erro ao buscar números vendidos:', err);
    // Em caso de erro, retorna o cache se existir, mesmo que expirado
    if (soldNumbersCache.length > 0) {
      return soldNumbersCache;
    }
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

// Implementar um sistema de limpeza periódica para evitar execuções frequentes
let lastCleanupTime = 0;
const CLEANUP_INTERVAL_MS = 30000; // Executar limpeza no máximo a cada 30 segundos

/**
 * Limpa reservas de números expiradas com intervalo mínimo
 */
export const cleanupExpiredReservations = async (force = false): Promise<void> => {
  const now = Date.now();
  
  // Verificar se já não executamos uma limpeza recentemente
  if (!force && now - lastCleanupTime < CLEANUP_INTERVAL_MS) {
    console.log('[PERF] Ignorando limpeza de reservas, executada recentemente');
    return;
  }
  
  try {
    lastCleanupTime = now;
    const nowDate = new Date();
    const reservationsRef = collection(db, 'number_reservations');
    const expiredQuery = query(
      reservationsRef,
      where('expiresAt', '<', nowDate),
      limit(100) // Limitar para não sobrecarregar o banco em caso de muitas reservas
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
    
    // Se temos mais de 100 registros, podemos ter mais para limpar
    if (expiredSnapshot.size === 100) {
      // Programar próxima execução sem bloquear o fluxo atual
      setTimeout(() => cleanupExpiredReservations(true), 100);
    }
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
 * Gera um número formatado com zeros à esquerda com entropia melhorada
 * @param totalNumbers Total de números disponíveis
 */
export const generateFormattedNumber = (totalNumbers = MAX_AVAILABLE_NUMBERS): string => {
  // Adicionar entropia extra ao gerador
  const timestamp = Date.now();
  const randomSeed = timestamp ^ (Math.random() * 10000000);
  
  // Combinar com a semente da aplicação para melhor distribuição
  const combinedSeed = APP_SEED + randomSeed.toString();
  
  // Algoritmo Fisher-Yates para gerar número com melhor entropia
  let hash = 0;
  for (let i = 0; i < combinedSeed.length; i++) {
    hash = ((hash << 5) - hash) + combinedSeed.charCodeAt(i);
    hash = hash & hash; // Converter para inteiro 32 bits
  }
  
  // Garantir número positivo e dentro da faixa (1 a 10000)
  const randomNum = Math.abs(hash % totalNumbers) + 1;
  
  // Formatar para ter exatamente 5 dígitos com zeros à esquerda
  return randomNum.toString().padStart(NUMBER_DIGIT_COUNT, '0');
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
 * Verifica se um formato de número é válido de acordo com os padrões do sistema
 * @param number Número a ser validado
 * @returns Verdadeiro se o número está no formato correto
 */
export const isValidNumberFormat = (number: string): boolean => {
  // Verificar se é uma string de exatamente 5 dígitos numéricos
  const validFormatRegex = /^\d{5}$/;
  
  // Verificar se está dentro do intervalo permitido (00001 a 10000)
  const numericValue = parseInt(number, 10);
  
  return (
    validFormatRegex.test(number) && 
    numericValue >= 1 && 
    numericValue <= MAX_AVAILABLE_NUMBERS
  );
};

/**
 * Formata um número para o padrão do sorteio (5 dígitos)
 * @param number Número a ser formatado
 * @returns Número formatado com 5 dígitos
 */
export const formatRaffleNumber = (number: string | number): string => {
  const numStr = typeof number === 'number' ? number.toString() : number;
  
  // Limpar caracteres não numéricos
  const cleaned = numStr.replace(/\D/g, '');
  
  // Converter para número e garantir que está no intervalo válido
  const numericValue = parseInt(cleaned, 10) || 0;
  if (numericValue < 1 || numericValue > MAX_AVAILABLE_NUMBERS) {
    throw new Error(`Número fora do intervalo permitido (1-${MAX_AVAILABLE_NUMBERS}): ${numericValue}`);
  }
  
  // Formatar para ter exatamente 5 dígitos com zeros à esquerda
  return numericValue.toString().padStart(NUMBER_DIGIT_COUNT, '0');
};

/**
 * Gera múltiplos números únicos com reserva atômica com performance melhorada
 * @param count Quantidade de números a gerar
 */
export const generateUniqueNumbers = async (count: number): Promise<string[]> => {
  // Validação adicional de entrada para prevenir abuso
  if (count <= 0 || count > MAX_NUMBERS_PER_REQUEST) {
    throw new Error(`Quantidade inválida. Deve estar entre 1 e ${MAX_NUMBERS_PER_REQUEST}.`);
  }
  
  // Verificar se temos números suficientes disponíveis no sistema
  const soldNumbers = await fetchSoldNumbers();
  if (soldNumbers.length >= MAX_AVAILABLE_NUMBERS) {
    throw new Error(`Todos os ${MAX_AVAILABLE_NUMBERS} números já foram vendidos!`);
  }
  
  if (soldNumbers.length + count > MAX_AVAILABLE_NUMBERS) {
    throw new Error(`Não há números suficientes disponíveis. Restam apenas ${MAX_AVAILABLE_NUMBERS - soldNumbers.length} números.`);
  }
  
  // Log para auditoria
  console.log(`[AUDIT] Iniciando geração de ${count} números. Timestamp: ${new Date().toISOString()}`);
  
  // Executar limpeza enquanto já buscamos os números vendidos e reservados em paralelo
  const [soldNumbersList, reservedNumbers] = await Promise.all([
    fetchSoldNumbers(), // Usar cache se disponível
    fetchReservedNumbers(),
    cleanupExpiredReservations() // Executa em paralelo sem esperar resultado
  ]);
  
  // Combinar números indisponíveis
  const unavailableNumbers = new Set([...soldNumbersList, ...reservedNumbers]);
  
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
    
    // Implementar verificação direta de disponibilidade para maior eficiência
    // quando muitos números já estão reservados
    if (uniqueNumbers.length < count && attempts > count * 10) {
      console.log('[INFO] Muitas colisões detectadas, alterando estratégia de geração');
      
      // Buscar diretamente números que não existem nas coleções (estratégia mais eficiente)
      while (uniqueNumbers.length < count && attempts < maxAttempts) {
        // Gerar um lote de candidatos para testagem em batch
        const candidates = new Set<string>();
        for (let i = 0; i < Math.min(10, count - uniqueNumbers.length); i++) {
          let candidate;
          do {
            candidate = generateFormattedNumber();
          } while (candidates.has(candidate) || unavailableNumbers.has(candidate));
          candidates.add(candidate);
        }
        
        // Verificar candidatos em lote para maior eficiência
        const availableCandidates = await checkNumbersAvailabilityBatch(Array.from(candidates));
        
        // Reservar números disponíveis
        for (const number of availableCandidates) {
          const reserved = await reserveNumber(number, sessionId);
          if (reserved) {
            reservedInSession.push(number);
            uniqueNumbers.push(number);
            unavailableNumbers.add(number);
            
            if (uniqueNumbers.length >= count) break;
          }
        }
        
        attempts += candidates.size;
      }
    }
    
    // Verificar se conseguimos todos os números necessários
    if (uniqueNumbers.length < count) {
      // Se não conseguirmos todos os números, vamos limpar as reservas que fizemos
      await Promise.all(reservedInSession.map(num => removeReservation(num)));
      throw new Error(`Não foi possível gerar ${count} números únicos.`);
    }
    
    // Log para auditoria
    console.log(`[AUDIT] Geração concluída. ${uniqueNumbers.length} números gerados após ${attempts} tentativas.`);
    
    return uniqueNumbers;
  } catch (error) {
    // Em caso de erro, garantir que limpamos as reservas
    console.error('[ERROR] Erro ao gerar números únicos:', error);
    
    // Tentar limpar todas as reservas desta sessão
    await Promise.all(reservedInSession.map(num => removeReservation(num)));
    
    throw error;
  }
};

/**
 * Verifica a disponibilidade de múltiplos números em lote para otimizar performance
 * @param numbers Números a verificar
 */
export const checkNumbersAvailabilityBatch = async (numbers: string[]): Promise<string[]> => {
  if (!numbers.length) return [];
  
  try {
    // Verificar números já vendidos
    const ordersRef = collection(db, 'orders');
    const reservationsRef = collection(db, 'number_reservations');
    
    // Executar consultas em paralelo para melhor performance
    const [soldBatch, reservedBatch] = await Promise.all([
      // Verificar números já em pedidos
      getDocs(query(ordersRef, where('generatedNumbers', 'array-contains-any', numbers))),
      // Verificar números atualmente reservados e não expirados
      getDocs(query(reservationsRef, 
                    where(documentId(), 'in', numbers), 
                    where('expiresAt', '>', new Date())))
    ]);
    
    // Coletar números indisponíveis
    const unavailable = new Set<string>();
    
    // Processar resultados das consultas
    soldBatch.forEach(docSnap => {
      const data = docSnap.data();
      if (data.generatedNumbers && Array.isArray(data.generatedNumbers)) {
        data.generatedNumbers.forEach((num: string) => {
          if (numbers.includes(num)) unavailable.add(num);
        });
      }
    });
    
    reservedBatch.forEach(docSnap => {
      unavailable.add(docSnap.id);
    });
    
    // Retornar apenas os números disponíveis
    return numbers.filter(num => !unavailable.has(num));
  } catch (err) {
    console.error('Erro ao verificar disponibilidade em lote:', err);
    throw new Error('Não foi possível verificar disponibilidade dos números.');
  }
};

/**
 * Confirma os números reservados após criar um pedido com sucesso em lote
 */
export const confirmNumbersUsed = async (numbers: string[]): Promise<void> => {
  if (!numbers.length) return;
  
  try {
    // Para poucos números, usar Promise.all é eficiente
    if (numbers.length <= 10) {
      await Promise.all(numbers.map(num => removeReservation(num)));
      return;
    }
    
    // Para muitos números, usar um batch para melhor performance
    const chunks = [];
    for (let i = 0; i < numbers.length; i += 500) {
      chunks.push(numbers.slice(i, i + 500));
    }
    
    // Processar cada chunk em sequência para não sobrecarregar o Firestore
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const num of chunk) {
        const reservationRef = doc(db, 'number_reservations', num);
        batch.delete(reservationRef);
      }
      await batch.commit();
      console.log(`[PERF] Confirmados ${chunk.length} números em lote`);
    }
  } catch (error) {
    console.error('Erro ao confirmar uso de números:', error);
  }
};
