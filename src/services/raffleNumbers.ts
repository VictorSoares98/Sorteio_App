import { collection, getDocs, query, where, doc, deleteDoc, Timestamp, writeBatch, runTransaction, documentId, limit, setDoc, getDoc, orderBy, startAfter, endBefore } from 'firebase/firestore';
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

// Nome da coleção de números disponíveis
const AVAILABLE_NUMBERS_COLLECTION = 'available_numbers';
const SOLD_NUMBERS_COLLECTION = 'sold_numbers';

// Tamanho dos shards para dividir os números (1000 números por shard)
const SHARD_SIZE = 1000;
// Número de shards (10 shards para cobrir 10000 números)
const NUM_SHARDS = Math.ceil(MAX_AVAILABLE_NUMBERS / SHARD_SIZE);

/**
 * Inicializa a coleção de números disponíveis, dividida em shards
 * Esta função só precisa ser executada uma vez no setup inicial do sistema
 */
export const initAvailableNumbersCollection = async (): Promise<void> => {
  try {
    console.log('[SETUP] Iniciando população da coleção de números disponíveis');
    
    // Verificar se a coleção já existe e tem dados
    const checkDoc = await getDoc(doc(db, AVAILABLE_NUMBERS_COLLECTION, 'shard_1'));
    if (checkDoc.exists()) {
      console.log('[SETUP] Coleção de números já foi inicializada');
      return;
    }
    
    // Inicializar cada shard com seu conjunto de números
    const batch = writeBatch(db);
    
    for (let shardIndex = 0; shardIndex < NUM_SHARDS; shardIndex++) {
      const shardId = `shard_${shardIndex + 1}`;
      const startNumber = shardIndex * SHARD_SIZE + 1;
      const endNumber = Math.min((shardIndex + 1) * SHARD_SIZE, MAX_AVAILABLE_NUMBERS);
      
      // Criar array de números para este shard
      const numbersInShard: string[] = [];
      
      for (let num = startNumber; num <= endNumber; num++) {
        numbersInShard.push(num.toString().padStart(NUMBER_DIGIT_COUNT, '0'));
      }
      
      batch.set(doc(db, AVAILABLE_NUMBERS_COLLECTION, shardId), {
        startNumber,
        endNumber,
        numbers: numbersInShard,
        count: numbersInShard.length
      });
    }
    
    await batch.commit();
    console.log(`[SETUP] Coleção de números disponíveis inicializada com ${NUM_SHARDS} shards`);
    
  } catch (error) {
    console.error('[ERROR] Falha ao inicializar coleção de números:', error);
    throw new Error('Falha ao configurar sistema de números');
  }
};

// Verificar e ajustar a coleção de números disponíveis com base nos números já vendidos
export const syncAvailableNumbersWithSoldOnes = async (): Promise<void> => {
  try {
    console.log('[SYNC] Iniciando sincronização de números disponíveis com vendidos');
    
    // Buscar todos os números vendidos
    const soldNumbers = await fetchSoldNumbers(true);
    
    if (soldNumbers.length === 0) {
      console.log('[SYNC] Nenhum número vendido encontrado, sincronização não necessária');
      return;
    }
    
    // Agrupar números vendidos por shard
    const soldNumbersByShardId: Record<string, string[]> = {};
    
    for (const num of soldNumbers) {
      const numValue = parseInt(num, 10);
      const shardIndex = Math.floor((numValue - 1) / SHARD_SIZE);
      const shardId = `shard_${shardIndex + 1}`;
      
      if (!soldNumbersByShardId[shardId]) {
        soldNumbersByShardId[shardId] = [];
      }
      
      soldNumbersByShardId[shardId].push(num);
    }
    
    // Processar cada shard que tem números vendidos
    for (const [shardId, numbersToRemove] of Object.entries(soldNumbersByShardId)) {
      await runTransaction(db, async (transaction) => {
        const shardRef = doc(db, AVAILABLE_NUMBERS_COLLECTION, shardId);
        const shardDoc = await transaction.get(shardRef);
        
        if (!shardDoc.exists()) {
          console.warn(`[SYNC] Shard ${shardId} não encontrado, inicializando coleção primeiro`);
          throw new Error('Coleção de números disponíveis não inicializada');
        }
        
        const shardData = shardDoc.data();
        const updatedNumbers = shardData.numbers.filter(
          (num: string) => !numbersToRemove.includes(num)
        );
        
        transaction.update(shardRef, {
          numbers: updatedNumbers,
          count: updatedNumbers.length
        });
      });
      
      console.log(`[SYNC] Removidos ${numbersToRemove.length} números do shard ${shardId}`);
    }
    
  } catch (error) {
    console.error('[ERROR] Falha ao sincronizar números:', error);
    
    // Se o erro foi devido à coleção não inicializada, inicializá-la
    if (error instanceof Error && error.message.includes('não inicializada')) {
      await initAvailableNumbersCollection();
      await syncAvailableNumbersWithSoldOnes();
    } else {
      throw error;
    }
  }
};

/**
 * Gera números únicos utilizando a coleção de números disponíveis
 * Esta nova implementação é muito mais eficiente, especialmente com muitos números vendidos
 */
export const generateUniqueNumbers = async (count: number): Promise<string[]> => {
  if (count <= 0 || count > MAX_NUMBERS_PER_REQUEST) {
    throw new Error(`Quantidade inválida. Deve estar entre 1 e ${MAX_NUMBERS_PER_REQUEST}.`);
  }

  // Obter ID de sessão para agrupamento de reservas
  const sessionId = generateSessionId();
  const uniqueNumbers: string[] = [];
  const reservedInSession: string[] = [];

  try {
    console.log(`[AUDIT] Iniciando geração otimizada de ${count} números. Timestamp: ${new Date().toISOString()}`);
    
    // 1. Verificar se temos números suficientes disponíveis
    const totalAvailableCount = await getAvailableNumbersCount();
    
    if (totalAvailableCount === 0) {
      throw new Error('Nenhum número disponível encontrado. Verifique se a coleção foi inicializada.');
    }
    
    if (totalAvailableCount < count) {
      throw new Error(`Apenas ${totalAvailableCount} números disponíveis. Impossível gerar ${count} números.`);
    }
    
    // 2. Selecionar shards aleatoriamente até obter números suficientes
    const selectedShards = new Set<string>();
    const numRequiredPerShard = Math.ceil(count * 1.5); // Busca 50% a mais para ter margem de segurança
    
    while (selectedShards.size < NUM_SHARDS && uniqueNumbers.length < count) {
      // Selecionar um shard aleatório ainda não utilizado
      let nextShardIndex;
      do {
        nextShardIndex = Math.floor(Math.random() * NUM_SHARDS) + 1;
      } while (selectedShards.has(`shard_${nextShardIndex}`));
      
      const shardId = `shard_${nextShardIndex}`;
      selectedShards.add(shardId);
      
      // Buscar números deste shard
      const shardDoc = await getDoc(doc(db, AVAILABLE_NUMBERS_COLLECTION, shardId));
      
      if (!shardDoc.exists() || !shardDoc.data().numbers || shardDoc.data().numbers.length === 0) {
        continue; // Shard vazio ou não existe, tentar o próximo
      }
      
      // Pegar todos os números deste shard
      const shardNumbers = shardDoc.data().numbers as string[];
      
      // Embaralhar e selecionar números aleatoriamente
      const shuffledNumbers = shuffleArray(shardNumbers)
        .slice(0, Math.min(numRequiredPerShard, shardNumbers.length));
      
      // 3. Verificar disponibilidade e reservar esses números
      const availableNumbers = await checkNumbersAvailabilityBatch(shuffledNumbers);
      
      // 4. Para cada número disponível, criar reserva
      for (const number of availableNumbers) {
        if (uniqueNumbers.length >= count) break;
        
        const reserved = await reserveNumber(number, sessionId);
        
        if (reserved) {
          uniqueNumbers.push(number);
          reservedInSession.push(number);
          
          // Remover o número da coleção de disponíveis (temporariamente)
          await removeFromAvailableNumbers(number);
        }
      }
      
      if (uniqueNumbers.length >= count) break;
    }
    
    // Verificar se conseguimos números suficientes
    if (uniqueNumbers.length < count) {
      throw new Error(`Não foi possível gerar ${count} números únicos com a estratégia atual.`);
    }
    
    console.log(`[AUDIT] Geração otimizada concluída. ${uniqueNumbers.length} números gerados com sucesso.`);
    return uniqueNumbers;
    
  } catch (error) {
    console.error('[ERROR] Falha na geração de números:', error);
    
    // Limpar reservas e restaurar números à coleção de disponíveis
    if (reservedInSession.length > 0) {
      await Promise.all([
        Promise.all(reservedInSession.map(num => removeReservation(num))),
        Promise.all(reservedInSession.map(num => addToAvailableNumbers(num)))
      ]);
    }
    
    // Se o erro parece ser relacionado à falta de inicialização, tentar inicializar
    if (error instanceof Error && 
        (error.message.includes('inicializada') || 
         error.message.includes('Nenhum número disponível'))) {
      console.log('[RECOVERY] Tentando inicializar e sincronizar a coleção de números');
      await initAvailableNumbersCollection();
      await syncAvailableNumbersWithSoldOnes();
    }
    
    throw error;
  }
};

/**
 * Obtém a contagem total de números disponíveis combinando todos os shards
 */
export const getAvailableNumbersCount = async (): Promise<number> => {
  try {
    const shardsQuery = query(collection(db, AVAILABLE_NUMBERS_COLLECTION));
    const shardsSnapshot = await getDocs(shardsQuery);
    
    let totalCount = 0;
    shardsSnapshot.forEach(doc => {
      totalCount += doc.data().count || 0;
    });
    
    return totalCount;
  } catch (error) {
    console.error('[ERROR] Falha ao contar números disponíveis:', error);
    return 0;
  }
};

/**
 * Remove um número da coleção de disponíveis
 */
const removeFromAvailableNumbers = async (number: string): Promise<void> => {
  const numValue = parseInt(number, 10);
  const shardIndex = Math.floor((numValue - 1) / SHARD_SIZE);
  const shardId = `shard_${shardIndex + 1}`;
  
  try {
    await runTransaction(db, async (transaction) => {
      const shardRef = doc(db, AVAILABLE_NUMBERS_COLLECTION, shardId);
      const shardDoc = await transaction.get(shardRef);
      
      if (!shardDoc.exists()) return;
      
      const shardData = shardDoc.data();
      const updatedNumbers = shardData.numbers.filter((num: string) => num !== number);
      
      transaction.update(shardRef, {
        numbers: updatedNumbers,
        count: updatedNumbers.length
      });
    });
  } catch (error) {
    console.error(`[ERROR] Falha ao remover número ${number} dos disponíveis:`, error);
  }
};

/**
 * Adiciona um número de volta à coleção de disponíveis
 */
const addToAvailableNumbers = async (number: string): Promise<void> => {
  const numValue = parseInt(number, 10);
  const shardIndex = Math.floor((numValue - 1) / SHARD_SIZE);
  const shardId = `shard_${shardIndex + 1}`;
  
  try {
    await runTransaction(db, async (transaction) => {
      const shardRef = doc(db, AVAILABLE_NUMBERS_COLLECTION, shardId);
      const shardDoc = await transaction.get(shardRef);
      
      if (!shardDoc.exists()) {
        // Se o shard não existe, criar com este único número
        transaction.set(shardRef, {
          startNumber: shardIndex * SHARD_SIZE + 1,
          endNumber: (shardIndex + 1) * SHARD_SIZE,
          numbers: [number],
          count: 1
        });
        return;
      }
      
      const shardData = shardDoc.data();
      // Verificar se o número já não está na lista
      if (!shardData.numbers.includes(number)) {
        const updatedNumbers = [...shardData.numbers, number];
        transaction.update(shardRef, {
          numbers: updatedNumbers,
          count: updatedNumbers.length
        });
      }
    });
  } catch (error) {
    console.error(`[ERROR] Falha ao adicionar número ${number} aos disponíveis:`, error);
  }
};

/**
 * Embaralha um array usando o algoritmo Fisher-Yates
 */
const shuffleArray = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Adaptar a função confirmNumbersUsed para mover os números definitivamente
export const confirmNumbersUsed = async (numbers: string[]): Promise<void> => {
  if (!numbers.length) return;
  
  try {
    // 1. Remover reservas temporárias
    if (numbers.length <= 10) {
      await Promise.all(numbers.map(num => removeReservation(num)));
    } else {
      const chunks = [];
      for (let i = 0; i < numbers.length; i += 500) {
        chunks.push(numbers.slice(i, i + 500));
      }
      
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        for (const num of chunk) {
          const reservationRef = doc(db, 'number_reservations', num);
          batch.delete(reservationRef);
        }
        await batch.commit();
      }
    }
    
    // 2. Registrar em sold_numbers para referência futura
    for (const number of numbers) {
      await setDoc(doc(db, SOLD_NUMBERS_COLLECTION, number), {
        number,
        soldAt: Timestamp.fromDate(new Date())
      });
    }
    
    // Números já foram removidos da coleção available_numbers durante a reserva
    console.log(`[PERF] ${numbers.length} números confirmados como vendidos`);
    
  } catch (error) {
    console.error('[ERROR] Falha ao confirmar uso de números:', error);
    
    // Tentar restaurar números aos disponíveis em caso de erro
    for (const number of numbers) {
      try {
        await addToAvailableNumbers(number);
      } catch (restoreError) {
        console.error(`Falha ao restaurar número ${number}:`, restoreError);
      }
    }
  }
};

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
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc')  // Ordenar por data de expiração crescente
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
 * Limpa reservas de números expiradas com intervalo mínimo, suportando paginação bidirecional
 * @param force Forçar a limpeza, ignorando o intervalo mínimo
 * @param cursorDoc Documento de referência para paginação
 * @param direction Direção da paginação ('next' ou 'prev')
 */
export const cleanupExpiredReservations = async (force = false, cursorDoc: any = null, direction = 'next'): Promise<void> => {
  const now = Date.now();
  
  // Verificar se já não executamos uma limpeza recentemente
  if (!force && !cursorDoc && now - lastCleanupTime < CLEANUP_INTERVAL_MS) {
    console.log('[PERF] Ignorando limpeza de reservas, executada recentemente');
    return;
  }
  
  try {
    // Apenas atualiza o timestamp na primeira execução
    if (!cursorDoc) {
      lastCleanupTime = now;
    }
    
    const nowDate = new Date();
    const reservationsRef = collection(db, 'number_reservations');
    
    // Determinar a ordem baseada na direção
    const order = direction === 'prev' ? 'desc' : 'asc';
    
    // Configurar a consulta base
    let expiredQuery = query(
      reservationsRef,
      where('expiresAt', '<', nowDate),
      orderBy('expiresAt', order),
      limit(100)
    );
    
    // Adicionar cursor de paginação se tivermos um documento de referência
    if (cursorDoc) {
      // Usar startAfter para avançar, endBefore para retroceder
      expiredQuery = query(
        expiredQuery, 
        direction === 'prev' ? endBefore(cursorDoc) : startAfter(cursorDoc)
      );
    }
    
    const expiredSnapshot = await getDocs(expiredQuery);
    
    if (expiredSnapshot.empty) return;
    
    // Usar batch para excluir múltiplos documentos de uma vez
    const batch = writeBatch(db);
    
    expiredSnapshot.forEach((docSnapshot) => {
      batch.delete(docSnapshot.ref);
    });
    
    await batch.commit();
    console.log(`Limpeza: ${expiredSnapshot.size} reservas expiradas removidas`);
    
    // Se atingimos o limite, pode haver mais registros para processar
    if (expiredSnapshot.size === 100) {
      // Obter o documento de referência para a próxima página
      const refDoc = direction === 'prev' 
        ? expiredSnapshot.docs[0]  // Para navegação reversa, use o primeiro documento
        : expiredSnapshot.docs[expiredSnapshot.docs.length - 1];  // Para navegação normal, use o último documento
      
      // Processar o próximo lote sem bloquear o fluxo atual
      setTimeout(() => cleanupExpiredReservations(true, refDoc, direction), 100);
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
