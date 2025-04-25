import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
  runTransaction,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  BATCH_COLLECTION,
  BATCH_PREFIX,
  TOTAL_BATCHES,
  NUMBER_STATUS,
  LAST_UPDATED_FIELD
} from '../utils/batchConstants';
import { 
  getBatchIdForNumber,
  getBatchRange,
  formatBatchNumber
} from '../utils/batchUtils';
import { useNumberStore } from './numberCacheService';
import { isOnline } from '../services/connectivity';

/**
 * Interface para representar um número dentro de um batch
 */
export interface BatchNumberData {
  status: string;
  orderId?: string;
  buyerId?: string;
  buyerName?: string;
  sellerId?: string;
  soldAt?: Timestamp | Date;
  reservedUntil?: Timestamp | Date;
}

/**
 * Interface para representar um documento de batch completo
 */
export interface BatchDocument {
  batchId: string;
  startNumber: number;
  endNumber: number;
  numbers: Record<string, BatchNumberData>;
  lastUpdated: Timestamp | Date;
  raffleId?: string; // Opcional para suporte a múltiplos sorteios
}

// Armazenamento de operações pendentes para sincronização quando voltar online
const pendingOperations = {
  reserveNumbers: [] as {numbers: string[], expiryMinutes: number, raffleId?: string}[],
  markAsSold: [] as {numbers: string[], orderDetails: any, raffleId?: string}[]
};

// Flag para controlar se já estamos tentando sincronizar
let isSyncingPendingOperations = false;

/**
 * Tenta processar operações pendentes quando a conexão é restabelecida
 */
export async function syncPendingOperations(): Promise<void> {
  if (isSyncingPendingOperations || !isOnline.value) return;
  
  try {
    isSyncingPendingOperations = true;
    console.log('[RaffleBatch] Iniciando sincronização de operações pendentes');
    
    // Processar reservas pendentes
    const pendingReserves = [...pendingOperations.reserveNumbers];
    pendingOperations.reserveNumbers = [];
    
    for (const op of pendingReserves) {
      try {
        console.log(`[RaffleBatch] Sincronizando reserva de ${op.numbers.length} números`);
        await reserveNumbers(op.numbers, op.expiryMinutes, op.raffleId);
      } catch (e) {
        console.error('[RaffleBatch] Falha ao sincronizar reserva:', e);
        // Readicionar à fila em caso de falha
        pendingOperations.reserveNumbers.push(op);
      }
    }
    
    // Processar marcações de vendas pendentes
    const pendingMarks = [...pendingOperations.markAsSold];
    pendingOperations.markAsSold = [];
    
    for (const op of pendingMarks) {
      try {
        console.log(`[RaffleBatch] Sincronizando marcação de ${op.numbers.length} números como vendidos`);
        await markNumbersAsSold(op.numbers, op.orderDetails, op.raffleId);
      } catch (e) {
        console.error('[RaffleBatch] Falha ao sincronizar marcação de venda:', e);
        // Readicionar à fila em caso de falha
        pendingOperations.markAsSold.push(op);
      }
    }
    
    console.log('[RaffleBatch] Sincronização de operações pendentes concluída');
  } catch (error) {
    console.error('[RaffleBatch] Erro durante sincronização de operações pendentes:', error);
  } finally {
    isSyncingPendingOperations = false;
  }
}

/**
 * Gerencia a conectividade do Firestore para o sistema de batches
 * Permite forçar o modo offline ou online
 */
export async function setNetworkMode(online: boolean): Promise<void> {
  try {
    if (online) {
      console.log('[RaffleBatch] Habilitando rede do Firestore');
      await enableNetwork(db);
      await syncPendingOperations();
    } else {
      console.log('[RaffleBatch] Desabilitando rede do Firestore (modo offline forçado)');
      await disableNetwork(db);
    }
  } catch (error) {
    console.error(`[RaffleBatch] Erro ao ${online ? 'habilitar' : 'desabilitar'} a rede:`, error);
  }
}

// Configurar listener para mudanças no estado de conexão
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('[RaffleBatch] Conexão detectada, tentando sincronizar operações pendentes');
    await setNetworkMode(true);
  });
  
  window.addEventListener('offline', async () => {
    console.log('[RaffleBatch] Desconexão detectada, modo offline ativo');
    // Não precisamos desabilitar a rede explicitamente aqui, o Firestore detectará automaticamente
    // Mas registramos o evento para debug
  });
}

/**
 * Inicializa a estrutura de batches para um sorteio
 * @param raffleId ID opcional do sorteio (para múltiplos sorteios)
 */
export async function initializeBatchStructure(raffleId?: string): Promise<void> {
  console.log(`Inicializando estrutura de batches${raffleId ? ` para sorteio ${raffleId}` : ''}...`);
  
  // Verifica se já existe estrutura
  const firstBatchRef = doc(db, BATCH_COLLECTION, `${BATCH_PREFIX}1`);
  const firstBatchDoc = await getDoc(firstBatchRef);
  
  if (firstBatchDoc.exists()) {
    console.log('Estrutura de batches já inicializada');
    return;
  }
  
  const fbBatch = writeBatch(db);
  let batchOperations = 0;
  
  // Criar todos os batches
  for (let batchNum = 1; batchNum <= TOTAL_BATCHES; batchNum++) {
    const batchId = `${BATCH_PREFIX}${batchNum}`;
    const { start, end } = getBatchRange(batchId);
    
    // Inicializar o documento de batch
    const batchDoc: BatchDocument = {
      batchId,
      startNumber: start,
      endNumber: end,
      numbers: {},
      lastUpdated: new Date()
    };
    
    if (raffleId) {
      batchDoc.raffleId = raffleId;
    }
    
    // Inicializar cada número no batch como disponível
    for (let num = start; num <= end; num++) {
      const formattedNum = formatBatchNumber(num);
      batchDoc.numbers[formattedNum] = { status: NUMBER_STATUS.AVAILABLE };
    }
    
    // Adicionar ao batch do Firestore
    fbBatch.set(doc(db, BATCH_COLLECTION, batchId), batchDoc);
    batchOperations++;
    
    // Se atingir limite de 500 operações, commit e criar novo batch
    if (batchOperations >= 500) {
      await fbBatch.commit();
      console.log(`Processado ${batchOperations} operações`);
      batchOperations = 0;
    }
  }
  
  // Commit final se houver operações pendentes
  if (batchOperations > 0) {
    await fbBatch.commit();
    console.log(`Processado ${batchOperations} operações finais`);
  }
  
  console.log('Estrutura de batches inicializada com sucesso!');
}

/**
 * Verifica o status de um número específico
 * @param number Número a verificar
 * @param raffleId ID opcional do sorteio
 */
export async function getNumberStatus(
  number: string | number,
  raffleId?: string
): Promise<BatchNumberData | null> {
  try {
    const formattedNumber = typeof number === 'number' 
      ? formatBatchNumber(number) 
      : number;
      
    const batchId = getBatchIdForNumber(formattedNumber);
    const batchRef = doc(db, BATCH_COLLECTION, batchId);
    const batchDoc = await getDoc(batchRef);
    
    if (!batchDoc.exists()) {
      return null;
    }
    
    const batchData = batchDoc.data() as BatchDocument;
    
    // Verificar se o batch pertence ao sorteio correto (se especificado)
    if (raffleId && batchData.raffleId && batchData.raffleId !== raffleId) {
      return null;
    }
    
    return batchData.numbers[formattedNumber] || null;
  } catch (error) {
    console.error('Erro ao verificar status do número:', error);
    return null;
  }
}

/**
 * Atualiza o status de um número específico
 * @param number Número a atualizar
 * @param numberData Dados do número
 * @param raffleId ID opcional do sorteio
 */
export async function updateNumberStatus(
  number: string | number,
  numberData: BatchNumberData,
  raffleId?: string
): Promise<boolean> {
  try {
    const formattedNumber = typeof number === 'number' 
      ? formatBatchNumber(number) 
      : number;
      
    const batchId = getBatchIdForNumber(formattedNumber);
    const batchRef = doc(db, BATCH_COLLECTION, batchId);
    const batchDoc = await getDoc(batchRef);
    
    if (!batchDoc.exists()) {
      throw new Error(`Batch ${batchId} não encontrado`);
    }
    
    // Verificar se o batch pertence ao sorteio correto (se especificado)
    const batchData = batchDoc.data() as BatchDocument;
    if (raffleId && batchData.raffleId && batchData.raffleId !== raffleId) {
      console.error(`Batch ${batchId} não pertence ao sorteio ${raffleId}`);
      return false;
    }
    
    // Atualizar apenas o número específico e o timestamp de última atualização
    await updateDoc(batchRef, {
      [`numbers.${formattedNumber}`]: numberData,
      [LAST_UPDATED_FIELD]: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar status do número:', error);
    return false;
  }
}

/**
 * Obtém todos os números vendidos de todos os batches
 * @param raffleId ID opcional do sorteio
 * @returns Lista de números vendidos
 */
export async function getAllSoldNumbers(raffleId?: string): Promise<string[]> {
  const soldNumbers: string[] = [];
  const batchesRef = collection(db, BATCH_COLLECTION);
  
  // Aplicar filtro de raffleId se especificado
  let batchesSnapshot;
  if (raffleId) {
    const batchesQuery = query(batchesRef, where('raffleId', '==', raffleId));
    batchesSnapshot = await getDocs(batchesQuery);
  } else {
    batchesSnapshot = await getDocs(batchesRef);
  }
  
  batchesSnapshot.forEach((batchDoc) => {
    const batchData = batchDoc.data() as BatchDocument;
    
    // Extrair números vendidos deste batch
    Object.entries(batchData.numbers).forEach(([number, data]) => {
      if (data.status === NUMBER_STATUS.SOLD) {
        soldNumbers.push(number);
      }
    });
  });
  
  return soldNumbers;
}

/**
 * Reserva um conjunto de números para compra
 * @param numbers Lista de números a serem reservados
 * @param expiryMinutes Minutos até a expiração da reserva
 * @param raffleId ID opcional do sorteio
 */
export async function reserveNumbers(
  numbers: string[],
  expiryMinutes: number = 5,
  raffleId?: string
): Promise<boolean> {
  try {
    // Obter instância do cache de números
    const numberStore = useNumberStore();
    
    // Validação básica de entrada
    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
      console.error('Lista de números vazia ou inválida');
      return false;
    }

    if (expiryMinutes <= 0) {
      console.error('Tempo de expiração deve ser maior que zero');
      return false;
    }

    // Validar formato dos números
    const invalidFormats = numbers.filter(number => {
      try {
        // Tentar formatar para verificar se é válido
        typeof number === 'number' ? formatBatchNumber(number) : number;
        return false;
      } catch (err) {
        return true;
      }
    });

    if (invalidFormats.length > 0) {
      console.error(`Números com formato inválido: ${invalidFormats.join(', ')}`);
      return false;
    }
    
    // Verificar conectividade
    if (!isOnline.value) {
      console.warn('[ReserveNumbers] Dispositivo offline, adicionando operação à fila de pendências');
      pendingOperations.reserveNumbers.push({
        numbers: [...numbers],
        expiryMinutes,
        raffleId
      });
      
      // Ainda retornamos true para dar feedback positivo ao usuário
      // O Firebase lidará com a sincronização quando voltar online
      return true;
    }
    
    // Agrupar números por batch para minimizar operações
    const numbersByBatch: Record<string, string[]> = {};
    
    numbers.forEach(number => {
      const batchId = getBatchIdForNumber(number);
      if (!numbersByBatch[batchId]) {
        numbersByBatch[batchId] = [];
      }
      numbersByBatch[batchId].push(number);
    });
    
    console.log(`[ReserveNumbers] Tentando reservar ${numbers.length} números em ${Object.keys(numbersByBatch).length} batches`);
    
    // Calcular tempo de expiração
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + expiryMinutes);
    
    // Usar transação para garantir atomicidade
    const result = await runTransaction(db, async (transaction) => {
      // Verificar todos os batches e números antes de fazer alterações
      for (const [batchId, batchNumbers] of Object.entries(numbersByBatch)) {
        const batchRef = doc(db, BATCH_COLLECTION, batchId);
        const batchDoc = await transaction.get(batchRef);
        
        if (!batchDoc.exists()) {
          const errorMsg = `Batch ${batchId} não encontrado`;
          console.error(`[ReserveNumbers] ${errorMsg}`);
          throw new Error(errorMsg);
        }
        
        const batchData = batchDoc.data() as BatchDocument;
        
        // Verificar se o batch pertence ao sorteio correto (se especificado)
        if (raffleId && batchData.raffleId) {
          if (batchData.raffleId !== raffleId) {
            const errorMsg = `Batch ${batchId} pertence ao sorteio ${batchData.raffleId}, não ao ${raffleId}`;
            console.error(`[ReserveNumbers] ${errorMsg}`);
            return false;
          }
        } else if (raffleId && !batchData.raffleId) {
          console.warn(`[ReserveNumbers] Batch ${batchId} não tem raffleId associado, mas foi solicitado um sorteio específico`);
        }
        
        // Verificar se os números estão disponíveis
        const unavailableNumbers = batchNumbers.filter(number => {
          const numberData = batchData.numbers[number];
          return numberData && numberData.status !== NUMBER_STATUS.AVAILABLE;
        }); 
        
        if (unavailableNumbers.length > 0) {
          // Detalhamento dos números indisponíveis com seu status atual para diagnóstico
          const unavailableDetails = unavailableNumbers.map(number => {
            const data = batchData.numbers[number];
            return `${number}(${data ? data.status : 'não encontrado'})`;
          });
          
          const errorMsg = `Números não disponíveis: ${unavailableDetails.join(', ')}`;
          console.error(`[ReserveNumbers] ${errorMsg}`);
          throw new Error(errorMsg);
        }
      }
      
      // Todos os números estão disponíveis, agora podemos atualizar todos os batches
      for (const [batchId, batchNumbers] of Object.entries(numbersByBatch)) {
        const batchRef = doc(db, BATCH_COLLECTION, batchId);
        
        // Criar atualizações para cada número
        const updates: Record<string, any> = {
          [LAST_UPDATED_FIELD]: serverTimestamp()
        };
        
        batchNumbers.forEach(number => {
          updates[`numbers.${number}`] = {
            status: NUMBER_STATUS.PENDING,
            reservedUntil: expiryDate
          };
        });
        
        // Atualizar o batch dentro da transação
        transaction.update(batchRef, updates);
      }
      
      console.log(`[ReserveNumbers] Transação preparada para reservar ${numbers.length} números até ${expiryDate.toISOString()}`);
      // Se todas as operações forem bem-sucedidas, a transação será confirmada
      return true;
    });

    // Se a operação foi bem-sucedida, invalidar o cache para refletir as mudanças
    if (result) {
      numberStore.invalidateCache();
      console.log(`[ReserveNumbers] Sucesso: ${numbers.length} números reservados até ${expiryDate.toISOString()}`);
    } else {
      console.warn(`[ReserveNumbers] Operação não completada, possível conflito na transação`);
    }
    
    return result;
  } catch (error: unknown) { // Adicionar tipagem explícita ao error
    // Tratamento de erro aprimorado com contextualização
    const errorDetails = {
      operation: 'reserveNumbers',
      numberCount: numbers?.length || 0,
      expiryMinutes,
      raffleId: raffleId || 'não especificado',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      isOnline: isOnline.value
    };
    
    console.error(`[ReserveNumbers] Falha na reserva de números:`, errorDetails);
    
    // Se for um erro de rede e estivermos offline, tentar adicionar à fila de pendências
    if (!isOnline.value || (typeof error === 'object' && error !== null && 'toString' in error && error.toString().includes('network'))) {
      console.log('[ReserveNumbers] Adicionando operação à fila de pendências devido a erro de rede');
      pendingOperations.reserveNumbers.push({
        numbers: [...numbers],
        expiryMinutes,
        raffleId
      });
      
      // Simular sucesso para o usuário, será resolvido quando voltar online
      return true;
    }
    
    return false;
  }
}

/**
 * Marca um conjunto de números como vendidos
 * @param numbers Lista de números vendidos
 * @param orderDetails Detalhes da ordem (comprador, vendedor, etc)
 * @param raffleId ID opcional do sorteio
 */
export async function markNumbersAsSold(
  numbers: string[],
  orderDetails: {
    orderId: string,
    buyerId?: string,
    buyerName?: string,
    sellerId?: string
  },
  raffleId?: string
): Promise<boolean> {
  try {
    // Obter instância do cache de números
    const numberStore = useNumberStore();
    
    // Validação básica de entrada
    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
      console.error('[MarkAsSold] Lista de números vazia ou inválida');
      return false;
    }

    if (!orderDetails || !orderDetails.orderId) {
      console.error('[MarkAsSold] Detalhes do pedido inválidos ou orderId não fornecido');
      return false;
    }

    // Validar formato dos números
    const invalidFormats = numbers.filter(number => {
      try {
        // Tentar formatar para verificar se é válido
        typeof number === 'number' ? formatBatchNumber(number) : number;
        return false;
      } catch (err) {
        return true;
      }
    });

    if (invalidFormats.length > 0) {
      console.error(`[MarkAsSold] Números com formato inválido: ${invalidFormats.join(', ')}`);
      return false;
    }
    
    // Verificar conectividade
    if (!isOnline.value) {
      console.warn('[MarkAsSold] Dispositivo offline, adicionando operação à fila de pendências');
      pendingOperations.markAsSold.push({
        numbers: [...numbers],
        orderDetails: {...orderDetails},
        raffleId
      });
      
      // Ainda retornamos true para dar feedback positivo ao usuário
      // O Firebase lidará com a sincronização quando voltar online
      return true;
    }
    
    console.log(`[MarkAsSold] Tentando marcar ${numbers.length} números como vendidos para o pedido ${orderDetails.orderId}`);
    
    // Agrupar números por batch para minimizar operações
    const numbersByBatch: Record<string, string[]> = {};
    
    numbers.forEach(number => {
      const batchId = getBatchIdForNumber(number);
      if (!numbersByBatch[batchId]) {
        numbersByBatch[batchId] = [];
      }
      numbersByBatch[batchId].push(number);
    });
    
    // Usar transação para garantir atomicidade
    const result = await runTransaction(db, async (transaction) => {
      // Verificar todos os batches e números antes de fazer alterações
      for (const [batchId, batchNumbers] of Object.entries(numbersByBatch)) {
        const batchRef = doc(db, BATCH_COLLECTION, batchId);
        const batchDoc = await transaction.get(batchRef);
        
        if (!batchDoc.exists()) {
          const errorMsg = `Batch ${batchId} não encontrado`;
          console.error(`[MarkAsSold] ${errorMsg}`);
          return false;
        }
        
        const batchData = batchDoc.data() as BatchDocument;
        
        // Verificar se o batch pertence ao sorteio correto (se especificado)
        if (raffleId && batchData.raffleId) {
          if (batchData.raffleId !== raffleId) {
            const errorMsg = `Batch ${batchId} pertence ao sorteio ${batchData.raffleId}, não ao ${raffleId}`;
            console.error(`[MarkAsSold] ${errorMsg}`);
            return false;
          }
        } else if (raffleId && !batchData.raffleId) {
          console.warn(`[MarkAsSold] Batch ${batchId} não tem raffleId associado, mas foi solicitado um sorteio específico`);
        }
        
        // Verificar status atual dos números (apenas disponíveis ou pendentes podem ser vendidos)
        const invalidNumbers = batchNumbers.filter(number => {
          const numberData = batchData.numbers[number];
          return !numberData || numberData.status === NUMBER_STATUS.SOLD;
        });
        
        if (invalidNumbers.length > 0) {
          // Adicionar detalhes sobre os números inválidos
          const invalidDetails = invalidNumbers.map(number => {
            const data = batchData.numbers[number];
            return `${number}(${data ? data.status : 'não encontrado'})`;
          });
          
          const errorMsg = `Números já vendidos ou inexistentes: ${invalidDetails.join(', ')}`;
          console.error(`[MarkAsSold] ${errorMsg}`);
          return false;
        }
      }
      
      console.log(`[MarkAsSold] Verificação concluída. Marcando ${numbers.length} números como vendidos`);
      
      // Todos os números foram verificados, podemos atualizar os batches
      for (const [batchId, batchNumbers] of Object.entries(numbersByBatch)) {
        const batchRef = doc(db, BATCH_COLLECTION, batchId);
        
        // Criar atualizações para cada número
        const updates: Record<string, any> = {
          [LAST_UPDATED_FIELD]: serverTimestamp()
        };
        
        batchNumbers.forEach(number => {
          updates[`numbers.${number}`] = {
            status: NUMBER_STATUS.SOLD,
            orderId: orderDetails.orderId,
            buyerId: orderDetails.buyerId || null,
            buyerName: orderDetails.buyerName || null,
            sellerId: orderDetails.sellerId || null,
            soldAt: serverTimestamp()
          };
        });
        
        // Atualizar o batch dentro da transação
        transaction.update(batchRef, updates);
      }
      
      // Se todas as operações forem bem-sucedidas, a transação será confirmada
      return true;
    });
    
    // Se a operação foi bem-sucedida, invalidar o cache para refletir as mudanças
    if (result) {
      numberStore.invalidateCache();
      console.log(`[MarkAsSold] Sucesso: ${numbers.length} números marcados como vendidos para o pedido ${orderDetails.orderId}`);
    } else {
      console.warn(`[MarkAsSold] Operação não completada, verificar logs para detalhes`);
    }
    
    return result;
  } catch (error: unknown) { // Adicionar tipagem explícita ao error
    // Tratamento de erro aprimorado com contextualização
    const errorDetails = {
      operation: 'markNumbersAsSold',
      numberCount: numbers?.length || 0,
      orderId: orderDetails?.orderId || 'não especificado',
      buyerName: orderDetails?.buyerName || 'não especificado',
      sellerId: orderDetails?.sellerId || 'não especificado',
      raffleId: raffleId || 'não especificado',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      isOnline: isOnline.value
    };
    
    console.error(`[MarkAsSold] Falha ao marcar números como vendidos:`, errorDetails);
    
    // Se for um erro de rede e estivermos offline, tentar adicionar à fila de pendências
    if (!isOnline.value || (typeof error === 'object' && error !== null && 'toString' in error && error.toString().includes('network'))) {
      console.log('[MarkAsSold] Adicionando operação à fila de pendências devido a erro de rede');
      pendingOperations.markAsSold.push({
        numbers: [...numbers],
        orderDetails: {...orderDetails},
        raffleId
      });
      
      // Simular sucesso para o usuário, será resolvido quando voltar online
      return true;
    }
    
    return false;
  }
}

/**
 * Conta quantos números estão disponíveis em todos os batches
 * @param raffleId ID opcional do sorteio
 */
export async function countAvailableNumbers(raffleId?: string): Promise<number> {
  try {
    const batchesRef = collection(db, BATCH_COLLECTION);
    
    // Aplicar filtro de raffleId se especificado
    let batchesSnapshot;
    if (raffleId) {
      const batchesQuery = query(batchesRef, where('raffleId', '==', raffleId));
      batchesSnapshot = await getDocs(batchesQuery);
    } else {
      batchesSnapshot = await getDocs(batchesRef);
    }
    
    let availableCount = 0;
    
    batchesSnapshot.forEach((batchDoc) => {
      const batchData = batchDoc.data() as BatchDocument;
      
      // Contar números disponíveis neste batch
      Object.values(batchData.numbers).forEach(numberData => {
        if (numberData.status === NUMBER_STATUS.AVAILABLE) {
          availableCount++;
        }
      });
    });
    
    return availableCount;
  } catch (error) {
    console.error('Erro ao contar números disponíveis:', error);
    return 0;
  }
}

/**
 * Gera números aleatórios disponíveis para um pedido
 * @param count Quantidade de números desejada
 * @param raffleId ID opcional do sorteio
 */
export async function generateRandomAvailableNumbers(
  count: number, 
  raffleId?: string
): Promise<string[]> {
  try {
    // Obter batches com seus números disponíveis
    const batchesRef = collection(db, BATCH_COLLECTION);
    
    // Aplicar filtro de raffleId se especificado
    let batchesSnapshot;
    if (raffleId) {
      const batchesQuery = query(batchesRef, where('raffleId', '==', raffleId));
      batchesSnapshot = await getDocs(batchesQuery);
    } else {
      batchesSnapshot = await getDocs(batchesRef);
    }
    
    // Coletar todos os números disponíveis
    const availableNumbers: string[] = [];
    
    batchesSnapshot.forEach((batchDoc) => {
      const batchData = batchDoc.data() as BatchDocument;
      
      Object.entries(batchData.numbers).forEach(([number, data]) => {
        if (data.status === NUMBER_STATUS.AVAILABLE) {
          availableNumbers.push(number);
        }
      });
    });
    
    if (availableNumbers.length < count) {
      throw new Error(`Não há números suficientes disponíveis. Solicitados: ${count}, Disponíveis: ${availableNumbers.length}`);
    }
    
    // Embaralhar e pegar a quantidade desejada
    const shuffled = availableNumbers.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
    
  } catch (error) {
    console.error('Erro ao gerar números aleatórios:', error);
    throw error;
  }
}

/**
 * Obtém um mapa com a contagem de números por status
 * @param raffleId ID opcional do sorteio
 */
export async function getNumbersStatusCount(
  raffleId?: string
): Promise<Record<string, number>> {
  try {
    const batchesRef = collection(db, BATCH_COLLECTION);
    
    // Aplicar filtro de raffleId se especificado
    let batchesSnapshot;
    if (raffleId) {
      const batchesQuery = query(batchesRef, where('raffleId', '==', raffleId));
      batchesSnapshot = await getDocs(batchesQuery);
    } else {
      batchesSnapshot = await getDocs(batchesRef);
    }
    
    const statusCount: Record<string, number> = {
      [NUMBER_STATUS.AVAILABLE]: 0,
      [NUMBER_STATUS.PENDING]: 0,
      [NUMBER_STATUS.SOLD]: 0
    };
    
    batchesSnapshot.forEach((batchDoc) => {
      const batchData = batchDoc.data() as BatchDocument;
      
      Object.values(batchData.numbers).forEach(data => {
        if (statusCount[data.status] !== undefined) {
          statusCount[data.status]++;
        }
      });
    });
    
    return statusCount;
  } catch (error) {
    console.error('Erro ao contar status dos números:', error);
    return {
      [NUMBER_STATUS.AVAILABLE]: 0,
      [NUMBER_STATUS.PENDING]: 0,
      [NUMBER_STATUS.SOLD]: 0
    };
  }
}

/**
 * Limpa reservas expiradas e marca números como disponíveis novamente
 * @param raffleId ID opcional do sorteio
 */
export async function clearExpiredReservations(raffleId?: string): Promise<number> {
  try {
    const batchesRef = collection(db, BATCH_COLLECTION);
    const now = new Date();
    let totalCleared = 0;
    
    // Aplicar filtro de raffleId se especificado
    let batchesSnapshot;
    if (raffleId) {
      const batchesQuery = query(batchesRef, where('raffleId', '==', raffleId));
      batchesSnapshot = await getDocs(batchesQuery);
    } else {
      batchesSnapshot = await getDocs(batchesRef);
    }
    
    for (const batchDoc of batchesSnapshot.docs) {
      const batchData = batchDoc.data() as BatchDocument;
      const batchRef = doc(db, BATCH_COLLECTION, batchData.batchId);
      
      const updates: Record<string, any> = {};
      let hasUpdates = false;
      
      // Verificar cada número no batch
      Object.entries(batchData.numbers).forEach(([number, data]) => {
        if (
          data.status === NUMBER_STATUS.PENDING && 
          data.reservedUntil
        ) {
          // Tratamento seguro para o campo reservedUntil
          let expiryDate: Date;
          if (data.reservedUntil instanceof Timestamp) {
            expiryDate = data.reservedUntil.toDate();
          } else {
            expiryDate = new Date(data.reservedUntil);
          }
          
          if (expiryDate < now) {
            updates[`numbers.${number}`] = { status: NUMBER_STATUS.AVAILABLE };
            hasUpdates = true;
            totalCleared++;
          }
        }
      });
      
      // Aplicar atualizações se necessário
      if (hasUpdates) {
        updates[LAST_UPDATED_FIELD] = serverTimestamp();
        await updateDoc(batchRef, updates);
      }
    }
    
    return totalCleared;
  } catch (error) {
    console.error('Erro ao limpar reservas expiradas:', error);
    return 0;
  }
}
