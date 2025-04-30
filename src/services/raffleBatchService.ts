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
  disableNetwork,
  onSnapshot,
  QuerySnapshot
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
import { isOnline, isServiceBlocked, updateConnectionState } from '../services/connectivity';
import { isNetworkError, categorizeNetworkError } from '../types/errors';

// Utilitários para reduzir código duplicado

/**
 * Valida o formato dos números fornecidos
 * @param numbers Lista de números a serem validados
 * @returns Array de números com formato inválido
 */
function validateNumbersFormat(numbers: string[]): string[] {
  return numbers.filter(number => {
    try {
      // Tentar formatar para verificar se é válido
      typeof number === 'number' ? formatBatchNumber(number) : number;
      return false;
    } catch (err) {
      return true;
    }
  });
}

/**
 * Agrupa números por batch para minimizar operações
 * @param numbers Lista de números para agrupar
 * @returns Mapa de batchId para lista de números
 */
function groupNumbersByBatch(numbers: string[]): Record<string, string[]> {
  const numbersByBatch: Record<string, string[]> = {};
  
  numbers.forEach(number => {
    const batchId = getBatchIdForNumber(number);
    if (!numbersByBatch[batchId]) {
      numbersByBatch[batchId] = [];
    }
    numbersByBatch[batchId].push(number);
  });
  
  return numbersByBatch;
}
  
/**
 * Agrupa operações pendentes por raffleId para processar em batch
 * @param operations Lista de operações pendentes do mesmo tipo
 * @returns Operações agrupadas por raffleId
 */
function groupOperationsByRaffleId<T extends { raffleId?: string }>(operations: T[]): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  
  operations.forEach(op => {
    // Usar "default" como chave para operações sem raffleId
    const key = op.raffleId || 'default';
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    
    grouped[key].push(op);
  });
  
  return grouped;
}

/**
 * Obtém QuerySnapshot de batches com opção de filtro por raffleId
 * @param raffleId ID opcional do sorteio
 * @returns Promise com QuerySnapshot dos batches
 */
async function getBatchesQuerySnapshot(raffleId?: string): Promise<QuerySnapshot> {
  const batchesRef = collection(db, BATCH_COLLECTION);
  
  if (raffleId) {
    const batchesQuery = query(batchesRef, where('raffleId', '==', raffleId));
    return await getDocs(batchesQuery);
  } else {
    return await getDocs(batchesRef);
  }
}

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

/**
 * Interface para detalhes de ordem ao marcar números como vendidos
 */
export interface OrderDetails {
  orderId: string;
  buyerId?: string;
  buyerName?: string;
  sellerId?: string;
}

// Armazenamento de operações pendentes para sincronização quando voltar online
const pendingOperations = {
  reserveNumbers: [] as {numbers: string[], expiryMinutes: number, raffleId?: string}[],
  markAsSold: [] as {numbers: string[], orderDetails: OrderDetails, raffleId?: string}[]
};

// Flag para controlar se já estamos tentando sincronizar
let isSyncingPendingOperations = false;

// Rastrear estado real de conectividade do Firestore
let firestoreConnectivityUnsubscribe: (() => void) | null = null;

/**
 * Tenta processar operações pendentes quando a conexão é restabelecida
 * @returns Promise<boolean> Indica se a sincronização foi bem-sucedida
 */
export async function syncPendingOperations(): Promise<boolean> {
  if (isSyncingPendingOperations || !isOnline.value) return false;
  
  try {
    isSyncingPendingOperations = true;
    console.log('[RaffleBatch] Iniciando sincronização de operações pendentes');
    
    // Agrupar reservas pendentes por raffleId para melhor eficiência
    const pendingReservesByRaffleId = groupOperationsByRaffleId(pendingOperations.reserveNumbers);
    pendingOperations.reserveNumbers = [];
    
    let allSuccess = true;
    
    // Usar Promise.allSettled para processar as operações de forma paralela
    // mas sem que uma falha impeça as outras de prosseguir
    const reserveResults = await Promise.allSettled(
      // Para cada raffleId, processa as operações relacionadas
      Object.entries(pendingReservesByRaffleId).flatMap(([raffleId, operations]) => 
        operations.map(async op => {
          try {
            console.log(`[RaffleBatch] Sincronizando reserva de ${op.numbers.length} números para raffleId: ${raffleId !== 'default' ? raffleId : 'padrão'}`);
            return await reserveNumbers(op.numbers, op.expiryMinutes, raffleId !== 'default' ? raffleId : undefined);
          } catch (e) {
            console.error('[RaffleBatch] Falha ao sincronizar reserva:', e);
            // Readicionar à fila em caso de falha
            pendingOperations.reserveNumbers.push(op);
            return false;
          }
        })
      )
    );
    
    // Verificar resultados das reservas
    for (const result of reserveResults) {
      if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value)) {
        allSuccess = false;
      }
    }
    
    // Agrupar marcações de vendas pendentes por raffleId para melhor eficiência
    const pendingMarksByRaffleId = groupOperationsByRaffleId(pendingOperations.markAsSold);
    pendingOperations.markAsSold = [];
    
    // Usar Promise.allSettled para processar as operações de forma paralela
    const markResults = await Promise.allSettled(
      // Para cada raffleId, processa as operações relacionadas
      Object.entries(pendingMarksByRaffleId).flatMap(([raffleId, operations]) =>
        operations.map(async op => {
          try {
            console.log(`[RaffleBatch] Sincronizando marcação de ${op.numbers.length} números como vendidos para raffleId: ${raffleId !== 'default' ? raffleId : 'padrão'}`);
            return await markNumbersAsSold(op.numbers, op.orderDetails, raffleId !== 'default' ? raffleId : undefined);
          } catch (e) {
            console.error('[RaffleBatch] Falha ao sincronizar marcação de venda:', e);
            // Readicionar à fila em caso de falha
            pendingOperations.markAsSold.push(op);
            return false;
          }
        })
      )
    );
    
    // Verificar resultados das marcações
    for (const result of markResults) {
      if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value)) {
        allSuccess = false;
      }
    }

    console.log(`[RaffleBatch] Sincronização de operações pendentes concluída. Sucesso total: ${allSuccess}`);
    return allSuccess;
  } catch (error) {
    console.error('[RaffleBatch] Erro durante sincronização de operações pendentes:', error);
    return false;
  } finally {
    isSyncingPendingOperations = false;
  }
}

/**
 * Verifica e processa operações pendentes quando apropriado
 * @param forceSync Força a sincronização mesmo se não estiver online
 * @returns Promise<boolean> Indica se a verificação foi realizada
 */
export async function checkPendingOperations(forceSync: boolean = false): Promise<boolean> {
  // Não prosseguir se já estiver sincronizando ou não estiver online (a menos que forceSync seja true)
  if (isSyncingPendingOperations || (!isOnline.value && !forceSync)) {
    return false;
  }
  
  // Verificar se há operações pendentes
  const hasPendingOperations = 
    pendingOperations.reserveNumbers.length > 0 || 
    pendingOperations.markAsSold.length > 0;
  
  if (hasPendingOperations) {
    return await syncPendingOperations();
  }
  
  return true;
}

/**
 * Gerencia a conectividade do Firestore para o sistema de batches
 * Permite forçar o modo offline ou online e sincroniza com o estado global da aplicação
 * @param online Define se o modo deve ser online (true) ou offline (false)
 * @returns Promise<boolean> Indica se a operação foi bem-sucedida
 */
export async function setNetworkMode(online: boolean): Promise<boolean> {
  try {
    if (online) {
      console.log('[RaffleBatch] Habilitando rede do Firestore');
      await enableNetwork(db);
      // Atualizar estado global de conectividade
      updateConnectionState(true);
      // Iniciar monitoramento da conexão real do Firestore se ainda não estiver ativo
      setupFirestoreConnectivityMonitoring();
      // Tentar sincronizar operações pendentes
      await checkPendingOperations();
      return true;
    } else {
      console.log('[RaffleBatch] Desabilitando rede do Firestore (modo offline forçado)');
      await disableNetwork(db);
      // Atualizar estado global de conectividade
      updateConnectionState(false);
      // Limpar monitoramento de conectividade quando desligamos intencionalmente
      cleanupFirestoreConnectivityMonitoring();
      return true;
    }
  } catch (error) {
    console.error(`[RaffleBatch] Erro ao ${online ? 'habilitar' : 'desabilitar'} a rede:`, error);
    
    // Em caso de erro ao habilitar a rede, verificar se é um problema de bloqueio
    if (online && error instanceof Error && 
        (error.message.includes('network') || error.message.includes('permission'))) {
      console.warn('[RaffleBatch] Possível bloqueio de rede detectado');
      isServiceBlocked.value = true;
    }
    return false;
  }
}

/**
 * Configura monitoramento em tempo real da conectividade do Firestore
 * usando o documento especial '.info/connected'
 * @returns Uma função para limpar o monitoramento
 */
function setupFirestoreConnectivityMonitoring(): (() => void) | null {
  // Evitar múltiplas instâncias
  if (firestoreConnectivityUnsubscribe) return firestoreConnectivityUnsubscribe;
  
  try {
    console.log('[RaffleBatch] Iniciando monitoramento de conectividade do Firestore');
    firestoreConnectivityUnsubscribe = onSnapshot(
      doc(db, '.info', 'connected'),
      (snapshot) => {
        const isConnected = !!snapshot.data()?.connected;
        console.log(`[RaffleBatch] Estado de conexão Firestore: ${isConnected ? 'conectado' : 'desconectado'}`);
        
        // Atualizar estado global apenas se mudou
        if (isOnline.value !== isConnected) {
          updateConnectionState(isConnected);
          
          // Se ficamos online, tentar sincronizar
          if (isConnected && !isSyncingPendingOperations) {
            // Usar um timeout para evitar problemas de concorrência
            setTimeout(() => checkPendingOperations(), 1000);
          }
        }
      },
      (error) => {
        console.error('[RaffleBatch] Erro no monitoramento de conectividade:', error);
        // Se houver erro no monitoramento, provavelmente estamos offline
        updateConnectionState(false);
      }
    );
    
    return firestoreConnectivityUnsubscribe;
  } catch (error) {
    console.error('[RaffleBatch] Falha ao configurar monitoramento de conectividade:', error);
    return null;
  }
}

/**
 * Limpa o monitoramento de conectividade do Firestore
 */
function cleanupFirestoreConnectivityMonitoring(): void {
  if (firestoreConnectivityUnsubscribe) {
    firestoreConnectivityUnsubscribe();
    firestoreConnectivityUnsubscribe = null;
    console.log('[RaffleBatch] Monitoramento de conectividade do Firestore finalizado');
  }
}

/**
 * Gerencia a reconexão quando o estado de rede é restaurado
 */
async function handleNetworkReconnection(): Promise<void> {
  console.log('[RaffleBatch] Gerenciando reconexão de rede');
  
  // Se os serviços externos estiverem bloqueados, não tentar reconexão normal
  if (isServiceBlocked.value) {
    console.warn('[RaffleBatch] Serviços externos bloqueados, usando modo de fallback');
    // No futuro poderíamos implementar um fallback específico aqui
    return;
  }
  
  // Usar um pequeno timeout para evitar múltiplas tentativas simultâneas
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const success = await setNetworkMode(true);
  
  if (success) {
    // Assegurar que as operações pendentes sejam verificadas após a rede ser restabelecida
    await checkPendingOperations();
  }
}

// Configurar listener para mudanças no estado de conexão com tratamento de debounce
if (typeof window !== 'undefined') {
  // Usar um sistema de debounce para evitar múltiplos eventos rápidos
  let reconnectionTimer: number | null = null;
  
  window.addEventListener('online', async () => {
    console.log('[RaffleBatch] Evento online detectado pelo navegador');
    
    // Limpar timer anterior se existir
    if (reconnectionTimer !== null) {
      clearTimeout(reconnectionTimer);
    }
    
    // Configurar novo timer para debounce
    reconnectionTimer = window.setTimeout(async () => {
      await handleNetworkReconnection();
      reconnectionTimer = null;
    }, 1000);
  });
  
  window.addEventListener('offline', async () => {
    console.log('[RaffleBatch] Evento offline detectado pelo navegador');
    
    // Limpar qualquer timer pendente de reconexão
    if (reconnectionTimer !== null) {
      clearTimeout(reconnectionTimer);
      reconnectionTimer = null;
    }
    
    await setNetworkMode(false);
  });
  
  // Iniciar monitoramento da conectividade do Firestore quando o módulo é carregado
  // (apenas se estamos online de acordo com o navegador)
  if (navigator.onLine) {
    // Pequeno atraso para assegurar que tudo está estável
    setTimeout(() => {
      setupFirestoreConnectivityMonitoring();
    }, 1000);
  }
  
  // Garantir limpeza ao descartar a janela
  window.addEventListener('beforeunload', () => {
    cleanupFirestoreConnectivityMonitoring();
    
    // Limpar qualquer timer pendente
    if (reconnectionTimer !== null) {
      clearTimeout(reconnectionTimer);
    }
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
  
  // Usar função utilitária para obter batches com filtro
  const batchesSnapshot = await getBatchesQuerySnapshot(raffleId);
  
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

    // Validar formato dos números usando função utilitária
    const invalidFormats = validateNumbersFormat(numbers);

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
    
    // Agrupar números por batch usando função utilitária
    let numbersByBatch = groupNumbersByBatch(numbers);
    
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
          console.log(`[ReserveNumbers] Detectados ${unavailableNumbers.length} números indisponíveis. Buscando substitutos...`);
          
          try {
            const { updatedNumbers, updatedNumbersByBatch } = await handleUnavailableNumbers(
              unavailableNumbers,
              numbers,
              raffleId
            );
            
            numbers = updatedNumbers;
            numbersByBatch = updatedNumbersByBatch;
          } catch (error: unknown) {
            console.error('[ReserveNumbers] Falha ao processar números indisponíveis:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Não foi possível substituir os números indisponíveis: ${errorMessage}`);
          }
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
    
    // Verificação estruturada de erro de rede
    if (!isOnline.value || isNetworkError(error)) {
      // Se for erro de rede, categorizar e registrar detalhes
      if (isNetworkError(error)) {
        const networkError = categorizeNetworkError(error);
        console.warn(`[ReserveNumbers] Erro de rede detectado: ${networkError.code} - ${networkError.message}`);
      }
      
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
 * Encontra números disponíveis para substituir números indisponíveis
 * @param count Quantidade de números substitutos necessários
 * @param excludeNumbers Números a serem excluídos da busca
 * @param raffleId ID opcional do sorteio
 * @returns Array com números substitutos
 */
async function findReplacementNumbers(
  count: number,
  excludeNumbers: string[] = [],
  raffleId?: string
): Promise<string[]> {
  // Criar conjunto de exclusão para busca eficiente
  const excludeSet = new Set(excludeNumbers);
  
  // Buscar candidatos nos batches
  const batchesSnapshot = await getBatchesQuerySnapshot(raffleId);
  const availableNumbers: string[] = [];
  
  // Coletar todos os números disponíveis que não estão na lista de exclusão
  batchesSnapshot.forEach((batchDoc) => {
    const batchData = batchDoc.data() as BatchDocument;
    
    Object.entries(batchData.numbers).forEach(([number, data]) => {
      if (data.status === NUMBER_STATUS.AVAILABLE && !excludeSet.has(number)) {
        availableNumbers.push(number);
      }
    });
  });
  
  // Verificar se temos números suficientes
  if (availableNumbers.length < count) {
    throw new Error(`Apenas ${availableNumbers.length} números disponíveis, necessários ${count}`);
  }
  
  // Embaralhar e selecionar a quantidade necessária
  const shuffled = availableNumbers.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Lida com números indisponíveis, substituindo-os por números disponíveis.
 * @param unavailableNumbers Lista de números indisponíveis.
 * @param currentNumbers Lista atual de números.
 * @param raffleId ID opcional do sorteio.
 * @returns Um objeto contendo os números atualizados e os números agrupados por batch.
 */
async function handleUnavailableNumbers(
  unavailableNumbers: string[],
  currentNumbers: string[],
  raffleId?: string
): Promise<{ updatedNumbers: string[]; updatedNumbersByBatch: Record<string, string[]> }> {
  const replacements = [];
  const neededCount = unavailableNumbers.length;
  const allCurrentNumbers = [...currentNumbers];

  const replacementNumbers = await findReplacementNumbers(neededCount, allCurrentNumbers, raffleId);

  if (replacementNumbers.length < neededCount) {
    throw new Error(`Não foi possível encontrar ${neededCount} números para substituição.`);
  }

  let replacementIndex = 0;
  const updatedNumbers = currentNumbers.map(number => {
    if (unavailableNumbers.includes(number)) {
      const replacement = replacementNumbers[replacementIndex++];
      replacements.push({ original: number, replacement });
      return replacement;
    }
    return number;
  });

  const updatedNumbersByBatch = groupNumbersByBatch(updatedNumbers);

  console.log(`[HandleUnavailableNumbers] Substituição realizada com sucesso: ${replacements.length} números substituídos`);
  return { updatedNumbers, updatedNumbersByBatch };
}

/**
 * Marca um conjunto de números como vendidos
 * @param numbers Lista de números vendidos
 * @param orderDetails Detalhes da ordem (comprador, vendedor, etc)
 * @param raffleId ID opcional do sorteio
 */
export async function markNumbersAsSold(
  numbers: string[],
  orderDetails: OrderDetails,
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

    // Validar formato dos números usando função utilitária
    const invalidFormats = validateNumbersFormat(numbers);

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
    
    // Agrupar números por batch usando função utilitária
    let numbersByBatch = groupNumbersByBatch(numbers);
    
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
          console.log(`[MarkAsSold] Detectados ${invalidNumbers.length} números indisponíveis. Buscando substitutos...`);
          
          // Criar registros dos números sendo substituídos
          const replacements = [];
          
          try {
            // Buscar números substitutos
            const neededCount = invalidNumbers.length;
            const allCurrentNumbers = [...numbers]; // Todos para exclusão
            
            const replacementNumbers = await findReplacementNumbers(
              neededCount, 
              allCurrentNumbers,
              raffleId
            );
            
            // Verificar se temos substitutos suficientes
            if (replacementNumbers.length < neededCount) {
              console.error(`[MarkAsSold] Não foi possível encontrar ${neededCount} números para substituição.`);
              return false;
            }
            
            // Substituir os números indisponíveis pelos substitutos
            let replacementIndex = 0;
            numbers = numbers.map(number => {
              if (invalidNumbers.includes(number)) {
                const replacement = replacementNumbers[replacementIndex++];
                replacements.push({
                  original: number,
                  replacement
                });
                return replacement;
              }
              return number;
            });
            
            // Reagrupar os números após substituição
            numbersByBatch = groupNumbersByBatch(numbers);
            
            // Continuar com o processamento usando os números substituídos
            console.log(`[MarkAsSold] Substituição realizada com sucesso: ${replacements.length} números`);
          } catch (error: unknown) {
            console.error('[MarkAsSold] Falha ao buscar números substitutos:', error);
            console.error(`Falha na substituição de números: ${error instanceof Error ? error.message : String(error)}`);
            return false;
          }
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
    
    return !!result; // Ensure we return a boolean value
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
    
    // Verificação estruturada de erro de rede
    if (!isOnline.value || isNetworkError(error)) {
      // Se for erro de rede, categorizar e registrar detalhes
      if (isNetworkError(error)) {
        const networkError = categorizeNetworkError(error);
        console.warn(`[MarkAsSold] Erro de rede detectado: ${networkError.code} - ${networkError.message}`);
      }
      
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
    // Usar função utilitária para obter batches com filtro
    const batchesSnapshot = await getBatchesQuerySnapshot(raffleId);
    
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
    // Usar função utilitária para obter batches com filtro
    const batchesSnapshot = await getBatchesQuerySnapshot(raffleId);
    
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
    // Usar função utilitária para obter batches com filtro
    const batchesSnapshot = await getBatchesQuerySnapshot(raffleId);
    
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
    // Usar função utilitária para obter batches com filtro
    const batchesSnapshot = await getBatchesQuerySnapshot(raffleId);
    const now = new Date();
    let totalCleared = 0;
    
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
