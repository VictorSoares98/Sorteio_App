import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
  runTransaction,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  BATCH_PREFIX,
  TOTAL_BATCHES,
  NUMBER_STATUS,
} from '../utils/batchConstants';
import { 
  getBatchIdForNumber,
  formatBatchNumber
} from '../utils/batchUtils';
import { useNumberStore } from './numberCacheService';
import { DEFAULT_LOTTERY_SETTINGS } from '../types/order';

// Constantes para o sistema de lotes
const BATCH_SIZE = 100;
const BATCHES_COLLECTION = 'numberBatches';
const METADATA_DOC_ID = 'metadata';

/**
 * Interface para dados de um lote
 */
interface BatchData {
  batchId: string;
  startNumber: number;
  endNumber: number;
  availableCount: number;
  soldCount: number;
  reservedCount: number;
  updatedAt: any;
  numbers?: Record<string, NumberStatus>; // Dictionary of number statuses
}

/**
 * Interface para metadados do sistema de lotes
 */
export interface BatchSystemMetadata {
  initialized: boolean;
  totalBatches: number;
  lastBatchId: string;
  updatedAt: any;
  raffleId?: string; // Adicionando suporte explícito para raffleId
}

/**
 * Interface para o status de um número
 */
export interface NumberStatus {
  status: string;
  orderId?: string;
  buyerId?: string;
  soldAt?: Date | Timestamp;
  reservedAt?: Date | Timestamp;
  reservedUntil?: Date | Timestamp;
}

/**
 * Inicializar a estrutura de lotes para um sorteio específico
 * @param raffleId ID do sorteio (opcional)
 */
export const initializeBatchStructure = async (raffleId?: string): Promise<boolean> => {
  try {
    console.log(`[RaffleBatch] Inicializando estrutura de lotes ${raffleId ? `para sorteio ${raffleId}` : ''}`);
    
    // Verificar se já está inicializado
    const metadataRef = doc(db, BATCHES_COLLECTION, getMetadataDocId(raffleId));
    const metadataSnap = await getDoc(metadataRef);
    
    if (metadataSnap.exists() && metadataSnap.data().initialized) {
      console.log(`[RaffleBatch] Sistema de lotes já inicializado ${raffleId ? `para sorteio ${raffleId}` : ''}`);
      return true;
    }
    
    // Usar a constante TOTAL_BATCHES importada em vez de recalcular
    console.log(`[RaffleBatch] Criando ${TOTAL_BATCHES} lotes para o sistema`);
    
    // Usar WriteTransaction para garantir operação atômica
    const batch = writeBatch(db);
    
    // Usar TOTAL_BATCHES para o loop
    for (let i = 0; i < TOTAL_BATCHES; i++) {
      const batchId = `${BATCH_PREFIX}${i.toString().padStart(4, '0')}`;
      const startNumber = DEFAULT_LOTTERY_SETTINGS.minNumber + (i * BATCH_SIZE);
      const endNumber = Math.min(startNumber + BATCH_SIZE - 1, DEFAULT_LOTTERY_SETTINGS.maxNumber);
      const batchSize = endNumber - startNumber + 1;
      
      const batchRef = doc(db, BATCHES_COLLECTION, getBatchDocId(batchId, raffleId));
      
      batch.set(batchRef, {
        batchId,
        startNumber,
        endNumber,
        availableCount: batchSize,
        soldCount: 0,
        reservedCount: 0,
        updatedAt: serverTimestamp(),
        raffleId: raffleId || null // Armazenar explicitamente o ID do sorteio
      });
    }
    
    // Salvar metadados usando TOTAL_BATCHES
    const lastBatchId = `${BATCH_PREFIX}${(TOTAL_BATCHES - 1).toString().padStart(4, '0')}`;
    batch.set(metadataRef, {
      initialized: true,
      totalBatches: TOTAL_BATCHES, // Usar explicitamente a constante importada
      lastBatchId,
      updatedAt: serverTimestamp(),
      raffleId: raffleId || null // Armazenar explicitamente o ID do sorteio
    });
    
    await batch.commit();
    console.log(`[RaffleBatch] Estrutura de lotes inicializada com sucesso ${raffleId ? `para sorteio ${raffleId}` : ''}`);
    return true;
  } catch (error) {
    console.error(`[RaffleBatch] Erro ao inicializar estrutura de lotes ${raffleId ? `para sorteio ${raffleId}` : ''}:`, error);
    throw error;
  }
};

/**
 * Obtém o status atual de um número específico
 * @param number Número do sorteio para verificar
 * @param raffleId ID do sorteio (opcional)
 * @returns Status do número ou null se não encontrado
 */
export const getNumberStatus = async (number: string, raffleId?: string): Promise<NumberStatus | null> => {
  try {
    // Obter o ID do lote para este número
    const numValue = parseInt(number, 10);
    const batchId = getBatchIdForNumber(numValue);
    const batchDocId = getBatchDocId(batchId, raffleId);
    
    // Obter o documento do lote
    const batchRef = doc(db, BATCHES_COLLECTION, batchDocId);
    const batchSnap = await getDoc(batchRef);
    
    if (!batchSnap.exists()) {
      console.warn(`[RaffleBatch] Lote ${batchDocId} não encontrado para número ${number}`);
      return null;
    }
    
    const batchData = batchSnap.data();
    
    // Obter o status do número específico na estrutura de numbers do batch
    const formattedNumber = formatBatchNumber(numValue);
    if (batchData.numbers && batchData.numbers[formattedNumber]) {
      return batchData.numbers[formattedNumber];
    }
    
    // Se não houver dados específicos para este número, ele está disponível por padrão
    return { status: NUMBER_STATUS.AVAILABLE };
  } catch (error) {
    console.error(`[RaffleBatch] Erro ao obter status para número ${number}:`, error);
    throw error;
  }
};

/**
 * Auxiliar para gerar ID de documento de metadados com suporte a raffleId
 */
const getMetadataDocId = (raffleId?: string): string => {
  return raffleId ? `metadata_${raffleId}` : METADATA_DOC_ID;
};

/**
 * Auxiliar para gerar ID de documento de lote com suporte a raffleId
 */
const getBatchDocId = (batchId: string, raffleId?: string): string => {
  return raffleId ? `${raffleId}_${batchId}` : batchId;
};

/**
 * Obter estatísticas de status dos números (disponíveis, vendidos, reservados)
 * @param raffleId ID do sorteio (opcional)
 * @returns Objeto com contadores por status
 */
export const getNumbersStatusCount = async (raffleId?: string) => {
  try {
    // Verificar se o sistema está inicializado
    const metadataRef = doc(db, BATCHES_COLLECTION, getMetadataDocId(raffleId));
    const metadataSnap = await getDoc(metadataRef);
    const metadata = metadataSnap.data() as BatchSystemMetadata | undefined;
    
    if (!metadataSnap.exists() || !metadata?.initialized) {
      console.log(`[RaffleBatch] Sistema de lotes não inicializado ${raffleId ? `para sorteio ${raffleId}` : ''}. Inicializando...`);
      await initializeBatchStructure(raffleId);
    }
    
    // Buscar todos os lotes para o sorteio específico
    let batchesQuery;
    if (raffleId) {
      batchesQuery = query(
        collection(db, BATCHES_COLLECTION),
        where('raffleId', '==', raffleId)
      );
    } else {
      batchesQuery = query(
        collection(db, BATCHES_COLLECTION),
        where('raffleId', '==', null)
      );
    }
    
    const batchesSnapshot = await getDocs(batchesQuery);
    
    // Calcular totais
    let availableCount = 0;
    let soldCount = 0;
    let reservedCount = 0;
    
    batchesSnapshot.forEach(batchDoc => {
      // Ignorar o documento de metadados
      if (batchDoc.id === getMetadataDocId(raffleId)) return;
      
      const batchData = batchDoc.data() as BatchData;
      availableCount += batchData.availableCount || 0;
      soldCount += batchData.soldCount || 0;
      reservedCount += batchData.reservedCount || 0;
    });
    
    return { availableCount, soldCount, reservedCount };
  } catch (error) {
    console.error(`[RaffleBatch] Erro ao obter estatísticas ${raffleId ? `para sorteio ${raffleId}` : ''}:`, error);
    throw error;
  }
};

export async function markNumbersAsSold(
  generatedNumbers: string[],
  orderInfo: { 
    orderId: string; 
    buyerId: string; 
    buyerName: string; 
    sellerId: string; 
  },
  raffleId?: string // Opcional: ID do sorteio específico
): Promise<boolean> {
  try {
    if (!generatedNumbers.length) {
      console.warn('[RaffleBatch] Nenhum número fornecido para marcar como vendido');
      return false;
    }
    
    console.log(`[RaffleBatch] Marcando ${generatedNumbers.length} números como vendidos${raffleId ? ` para o sorteio ${raffleId}` : ''}`);
    
    // Agrupar números por batch para minimizar operações
    const numbersByBatch: Record<string, string[]> = {};
    
    // Organizar números por lotes
    for (const number of generatedNumbers) {
      const numValue = parseInt(number, 10);
      const batchId = getBatchIdForNumber(numValue);
      const batchDocId = getBatchDocId(batchId, raffleId);
      
      if (!numbersByBatch[batchDocId]) {
        numbersByBatch[batchDocId] = [];
      }
      
      numbersByBatch[batchDocId].push(formatBatchNumber(numValue));
    }
    
    // Usar transação para garantir consistência e evitar condições de corrida
    return await runTransaction(db, async (transaction) => {
      // Fase 1: Verificar se todos os números ainda estão disponíveis
      const unavailableNumbers: string[] = [];
      
      for (const [batchDocId, numbers] of Object.entries(numbersByBatch)) {
        const batchRef = doc(db, BATCHES_COLLECTION, batchDocId);
        const batchDoc = await transaction.get(batchRef);
        
        if (!batchDoc.exists()) {
          console.warn(`[RaffleBatch] Lote ${batchDocId} não encontrado. Inicializando sistema...`);
          
          // Não podemos inicializar dentro da transação, então lançamos um erro específico
          throw new Error(`Lote ${batchDocId} não encontrado para o sorteio ${raffleId || 'padrão'}`);
        }
        
        const batchData = batchDoc.data();
        
        // Verificar cada número do lote
        for (const number of numbers) {
          const numberData = batchData.numbers?.[number];
          if (numberData && numberData.status !== NUMBER_STATUS.AVAILABLE) {
            unavailableNumbers.push(number);
          }
        }
      }
      
      // Se algum número não estiver disponível, abortar a transação
      if (unavailableNumbers.length > 0) {
        console.warn(`[RaffleBatch] Números não disponíveis encontrados: ${unavailableNumbers.join(', ')}`);
        throw new Error(`Os seguintes números não estão mais disponíveis no sorteio ${raffleId || 'padrão'}: ${unavailableNumbers.join(', ')}`);
      }
      
      // Fase 2: Todos os números estão disponíveis, marcá-los como vendidos
      for (const [batchDocId, numbers] of Object.entries(numbersByBatch)) {
        const batchRef = doc(db, BATCHES_COLLECTION, batchDocId);
        const batchDoc = await transaction.get(batchRef);
        const batchData = batchDoc.data() as BatchData;
        
        const updates: Record<string, any> = {};
        
        // Preparar as atualizações para cada número
        numbers.forEach(number => {
          updates[`numbers.${number}`] = {
            status: NUMBER_STATUS.SOLD,
            orderId: orderInfo.orderId,
            buyerId: orderInfo.buyerId,
            buyerName: orderInfo.buyerName,
            sellerId: orderInfo.sellerId,
            soldAt: serverTimestamp()
          };
        });
        
        // Atualizar contadores do batch
        const currentSoldCount = batchData.soldCount || 0;
        const currentAvailableCount = batchData.availableCount || 0;
        
        updates.soldCount = currentSoldCount + numbers.length;
        updates.availableCount = Math.max(0, currentAvailableCount - numbers.length);
        updates.updatedAt = serverTimestamp();
        
        // Aplicar atualizações dentro da transação
        transaction.update(batchRef, updates);
      }
      
      console.log(`[RaffleBatch] Todos os ${generatedNumbers.length} números foram marcados como vendidos para o sorteio ${raffleId || 'padrão'} (transação completa)`);
      return true;
    }).catch(async (error) => {
      // Tratamento específico para lotes não encontrados
      if (error.message && error.message.includes('não encontrado')) {
        try {
          await initializeBatchStructure(raffleId);
          console.log(`[RaffleBatch] Sistema inicializado para o sorteio ${raffleId || 'padrão'}, tentando novamente...`);
          // Se a inicialização for bem-sucedida, podemos tentar marcar os números novamente
          return await markNumbersAsSold(generatedNumbers, orderInfo, raffleId);
        } catch (initError) {
          console.error('[RaffleBatch] Erro ao inicializar estrutura de lotes:', initError);
          throw initError;
        }
      }
      throw error;
    });
  } catch (error) {
    console.error('[RaffleBatch] Erro ao marcar números como vendidos:', error);
    throw error;
  }
}

/**
 * Obtém um listener para atualizações em tempo real do status do número
 * @param number Número do sorteio para observar
 * @param callback Função a ser chamada quando o status mudar
 * @param raffleId ID do sorteio (opcional)
 * @returns Função para cancelar o listener
 */
export const getNumberStatusRealtime = (
  number: string, 
  callback: (status: NumberStatus | null) => void,
  raffleId?: string
): (() => void) => {
  try {
    // Obter o ID do lote para este número
    const numValue = parseInt(number, 10);
    const batchId = getBatchIdForNumber(numValue);
    const batchDocId = getBatchDocId(batchId, raffleId);
    
    // Obter referência do documento e configurar listener
    const batchRef = doc(db, BATCHES_COLLECTION, batchDocId);
    
    // Retornar o unsubscribe do onSnapshot
    return onSnapshot(batchRef, (doc) => {
      if (!doc.exists()) {
        callback(null);
        return;
      }
      
      const batchData = doc.data();
      const formattedNumber = formatBatchNumber(numValue);
      
      // Retornar status específico do número ou status disponível padrão
      if (batchData.numbers && batchData.numbers[formattedNumber]) {
        callback(batchData.numbers[formattedNumber]);
      } else {
        callback({ status: NUMBER_STATUS.AVAILABLE });
      }
    }, (error) => {
      console.error(`[RaffleBatch] Erro ao observar status do número ${number}:`, error);
      callback(null);
    });
  } catch (error) {
    console.error(`[RaffleBatch] Erro ao configurar listener para número ${number}:`, error);
    return () => {}; // Retornar uma função vazia para evitar erros
  }
};

/**
 * Obtém um listener para atualizações em tempo real das estatísticas de números
 * @param raffleId ID do sorteio (opcional)
 * @param callback Função de callback para receber as estatísticas atualizadas
 * @returns Função para cancelar o listener
 */
export const getNumbersStatsRealtime = (
  callback: (stats: { availableCount: number, soldCount: number, reservedCount: number }) => void,
  raffleId?: string
): (() => void) => {
  try {
    // Construir a query apropriada com base no raffleId
    let batchesQuery;
    if (raffleId) {
      batchesQuery = query(
        collection(db, BATCHES_COLLECTION),
        where('raffleId', '==', raffleId)
      );
    } else {
      batchesQuery = query(
        collection(db, BATCHES_COLLECTION),
        where('raffleId', '==', null)
      );
    }
    
    // Configurar o listener
    return onSnapshot(batchesQuery, (snapshot) => {
      // Calcular totais
      let availableCount = 0;
      let soldCount = 0;
      let reservedCount = 0;
      
      snapshot.forEach(batchDoc => {
        // Ignorar o documento de metadados
        if (batchDoc.id === getMetadataDocId(raffleId)) return;
        
        const batchData = batchDoc.data() as BatchData;
        availableCount += batchData.availableCount || 0;
        soldCount += batchData.soldCount || 0;
        reservedCount += batchData.reservedCount || 0;
      });
      
      // Chamar o callback com as estatísticas
      callback({ availableCount, soldCount, reservedCount });
    }, (error) => {
      console.error(`[RaffleBatch] Erro no listener de estatísticas ${raffleId ? `para sorteio ${raffleId}` : ''}:`, error);
    });
  } catch (error) {
    console.error(`[RaffleBatch] Erro ao configurar listener de estatísticas:`, error);
    return () => {}; // Retornar uma função vazia para evitar erros
  }
};

/**
 * Gera números aleatórios disponíveis (não vendidos, não reservados)
 * @param count Quantidade de números a gerar
 * @param raffleId ID do sorteio (opcional)
 * @returns Array de números disponíveis no formato padrão
 */
export const generateRandomAvailableNumbers = async (count: number, raffleId?: string): Promise<string[]> => {
  try {
    if (count <= 0) {
      throw new Error('Quantidade deve ser maior que zero');
    }
    
    // Verificar se o sistema está inicializado
    const metadataRef = doc(db, BATCHES_COLLECTION, getMetadataDocId(raffleId));
    const metadataSnap = await getDoc(metadataRef);
    const metadata = metadataSnap.data() as BatchSystemMetadata | undefined;
    
    if (!metadataSnap.exists() || !metadata?.initialized) {
      console.log(`[RaffleBatch] Sistema de lotes não inicializado ${raffleId ? `para sorteio ${raffleId}` : ''}. Inicializando...`);
      await initializeBatchStructure(raffleId);
    }
    
    // Verificar se temos números suficientes disponíveis
    const { availableCount } = await getNumbersStatusCount(raffleId);
    if (availableCount < count) {
      throw new Error(`Não há números suficientes disponíveis. Solicitados: ${count}, Disponíveis: ${availableCount}`);
    }
    
    // Buscar todos os lotes para o sorteio específico
    let batchesQuery;
    if (raffleId) {
      batchesQuery = query(
        collection(db, BATCHES_COLLECTION),
        where('raffleId', '==', raffleId)
      );
    } else {
      batchesQuery = query(
        collection(db, BATCHES_COLLECTION),
        where('raffleId', '==', null)
      );
    }
    
    const batchesSnapshot = await getDocs(batchesQuery);
    
    // Mapear lotes com números disponíveis
    const batchesWithAvailable: { batchId: string, startNumber: number, endNumber: number, availableCount: number }[] = [];
    batchesSnapshot.forEach(batchDoc => {
      // Ignorar o documento de metadados
      if (batchDoc.id === getMetadataDocId(raffleId)) return;
      
      const batchData = batchDoc.data() as BatchData;
      if (batchData.availableCount > 0) {
        batchesWithAvailable.push({
          batchId: batchDoc.id,
          startNumber: batchData.startNumber,
          endNumber: batchData.endNumber,
          availableCount: batchData.availableCount
        });
      }
    });
    
    if (batchesWithAvailable.length === 0) {
      throw new Error('Nenhum lote com números disponíveis encontrado');
    }
    
    console.log(`[RaffleBatch] Gerando ${count} números aleatórios disponíveis`);
    
    // Gerar os números aleatórios
    const generatedNumbers = new Set<string>();
    const maxAttempts = count * 10; // Limitar tentativas para evitar loops infinitos
    let attempts = 0;
    
    while (generatedNumbers.size < count && attempts < maxAttempts) {
      // Escolher um lote com base na probabilidade ponderada pela quantidade disponível
      let totalAvailable = 0;
      batchesWithAvailable.forEach(batch => (totalAvailable += batch.availableCount));
      
      let cumulativeProbability = 0;
      let selectedBatch = batchesWithAvailable[0];
      
      // Gerar número aleatório entre 0 e 1
      const rand = Math.random();
      
      // Selecionar lote com base na probabilidade ponderada
      for (const batch of batchesWithAvailable) {
        const probability = batch.availableCount / totalAvailable;
        cumulativeProbability += probability;
        
        if (rand <= cumulativeProbability) {
          selectedBatch = batch;
          break;
        }
      }
      
      // Gerar um número aleatório dentro do intervalo do lote selecionado
      const batchRef = doc(db, BATCHES_COLLECTION, selectedBatch.batchId);
      const batchDoc = await getDoc(batchRef);
      const batchData = batchDoc.data() as BatchData;
      
      // Se o lote tem mais de 25% de números disponíveis, usar método de rejeição
      if (selectedBatch.availableCount > (selectedBatch.endNumber - selectedBatch.startNumber + 1) * 0.25) {
        const min = selectedBatch.startNumber;
        const max = selectedBatch.endNumber;
        const randomValue = Math.floor(Math.random() * (max - min + 1)) + min;
        const formattedNum = formatBatchNumber(randomValue);
        
        // Verificar se o número está disponível
        const numberData = batchData.numbers?.[formattedNum];
        if (!numberData || numberData.status === NUMBER_STATUS.AVAILABLE) {
          generatedNumbers.add(formattedNum);
        }
      }
      // Se o lote tem poucos números disponíveis, buscar todos os disponíveis e escolher
      else {
        const availableNumbers: string[] = [];
        
        // Coletar todos os números disponíveis no lote
        for (let num = selectedBatch.startNumber; num <= selectedBatch.endNumber; num++) {
          const formattedNum = formatBatchNumber(num);
          const numberData = batchData.numbers?.[formattedNum];
          
          if (!numberData || numberData.status === NUMBER_STATUS.AVAILABLE) {
            availableNumbers.push(formattedNum);
          }
        }
        
        if (availableNumbers.length > 0) {
          // Escolher aleatoriamente um número disponível
          const randomIndex = Math.floor(Math.random() * availableNumbers.length);
          const randomNumber = availableNumbers[randomIndex];
          
          generatedNumbers.add(randomNumber);
        }
      }
      
      attempts++;
    }
    
    // Verificar se conseguimos gerar todos os números necessários
    if (generatedNumbers.size < count) {
      throw new Error(`Não foi possível gerar ${count} números únicos após ${attempts} tentativas`);
    }
    
    const result = Array.from(generatedNumbers);
    console.log(`[RaffleBatch] Gerados ${result.length} números aleatórios disponíveis`);
    
    // Invalidar o cache após gerar novos números
    const numberStore = useNumberStore();
    numberStore.invalidateCache();
    
    return result;
  } catch (error) {
    console.error(`[RaffleBatch] Erro ao gerar números disponíveis aleatórios:`, error);
    throw error;
  }
};

/**
 * Limpa as reservas expiradas e retorna o número de reservas limpas
 * @param raffleId ID do sorteio (opcional)
 * @returns Promise com o número de reservas limpas
 */
export const clearExpiredReservations = async (raffleId?: string): Promise<number> => {
  try {
    console.log(`[RaffleBatch] Iniciando limpeza de reservas expiradas ${raffleId ? `para sorteio ${raffleId}` : ''}`);
    
    // Consultar lotes com números reservados
    let batchesQuery;
    if (raffleId) {
      batchesQuery = query(
        collection(db, BATCHES_COLLECTION),
        where('raffleId', '==', raffleId),
        where('reservedCount', '>', 0)
      );
    } else {
      batchesQuery = query(
        collection(db, BATCHES_COLLECTION),
        where('raffleId', '==', null),
        where('reservedCount', '>', 0)
      );
    }
    
    const batchesSnapshot = await getDocs(batchesQuery);
    
    if (batchesSnapshot.empty) {
      console.log('[RaffleBatch] Nenhum lote com reservas encontrado');
      return 0;
    }
    
    console.log(`[RaffleBatch] Encontrados ${batchesSnapshot.size} lotes com potenciais reservas expiradas`);
    
    const now = new Date();
    let totalCleared = 0;
    
    // Para cada lote, processar as reservas expiradas
    for (const batchDoc of batchesSnapshot.docs) {
      // Ignorar metadados
      if (batchDoc.id === getMetadataDocId(raffleId)) continue;
      
      const batchData = batchDoc.data() as BatchData;
      const batchRef = doc(db, BATCHES_COLLECTION, batchDoc.id);
      
      // Se não temos números ou não temos reservas, pular
      if (!batchData.numbers || batchData.reservedCount <= 0) continue;
      
      // Identificar números com reservas expiradas
      const expiredNumbers: string[] = [];
      
      // Iterar sobre os números do lote
      Object.entries(batchData.numbers).forEach(([number, data]) => {
        // Verificar se é uma reserva expirada
        if (data && 
            data.status === NUMBER_STATUS.PENDING && 
            data.reservedUntil) {
          
          // Converter reservedUntil para objeto Date se necessário
          let expiryDate: Date;
          if (data.reservedUntil instanceof Date) {
            expiryDate = data.reservedUntil;
          } else if (data.reservedUntil instanceof Timestamp || 
                    (typeof data.reservedUntil === 'object' && 'toDate' in data.reservedUntil)) {
            // Handle Firebase Timestamp
            expiryDate = data.reservedUntil.toDate();
          } else if (typeof data.reservedUntil === 'string' || typeof data.reservedUntil === 'number') {
            expiryDate = new Date(data.reservedUntil);
          } else {
            // Fallback for unexpected types
            console.warn('[RaffleBatch] Tipo de data inesperado:', data.reservedUntil);
            expiryDate = new Date();
          }
          
          // Verificar se a reserva expirou
          if (expiryDate < now) {
            expiredNumbers.push(number);
          }
        }
      });
      
      // Se não há números expirados neste lote, pular
      if (expiredNumbers.length === 0) continue;
      
      console.log(`[RaffleBatch] Encontradas ${expiredNumbers.length} reservas expiradas no lote ${batchDoc.id}`);
      
      // Usar transação para atualizar o lote de forma atômica
      await runTransaction(db, async (transaction) => {
        // Obter dados atualizados do lote
        const currentBatchDoc = await transaction.get(batchRef);
        const currentBatchData = currentBatchDoc.data() as BatchData;
        
        if (!currentBatchData) {
          console.error(`[RaffleBatch] Lote ${batchDoc.id} não encontrado durante a transação`);
          return;
        }
        
        // Preparar atualizações
        const updates: Record<string, any> = {};
        
        expiredNumbers.forEach(number => {
          // Atualizar o status de cada número expirado para AVAILABLE
          updates[`numbers.${number}`] = {
            status: NUMBER_STATUS.AVAILABLE
          };
        });
        
        // Atualizar contadores
        const clearedCount = expiredNumbers.length;
        updates.reservedCount = Math.max(0, (currentBatchData.reservedCount || 0) - clearedCount);
        updates.availableCount = (currentBatchData.availableCount || 0) + clearedCount;
        updates.updatedAt = serverTimestamp();
        
        // Aplicar atualizações
        transaction.update(batchRef, updates);
        
        // Acumular número total de reservas limpas
        totalCleared += clearedCount;
      });
    }
    
    console.log(`[RaffleBatch] Total de reservas limpas: ${totalCleared}`);
    
    return totalCleared;
  } catch (error) {
    console.error(`[RaffleBatch] Erro ao limpar reservas expiradas:`, error);
    throw error;
  }
};

export function getAllSoldNumbers(): string[] | PromiseLike<string[]> {
  throw new Error('Function not implemented.');
}

