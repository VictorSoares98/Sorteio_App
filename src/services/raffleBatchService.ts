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
import { safeFetch } from './networkWrappers'; // Importar os wrappers seguros
import { DEFAULT_LOTTERY_SETTINGS } from '../types/order';

// Constantes para o sistema de lotes
const BATCH_SIZE = 100;
const NUMBERS_COLLECTION = 'raffleNumbers';
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
}

/**
 * Interface para metadados do sistema de lotes
 */
interface BatchSystemMetadata {
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
    
    // Criar lotes de números
    const totalNumbers = DEFAULT_LOTTERY_SETTINGS.maxNumber - DEFAULT_LOTTERY_SETTINGS.minNumber + 1;
    const totalBatches = Math.ceil(totalNumbers / BATCH_SIZE);
    
    console.log(`[RaffleBatch] Criando ${totalBatches} lotes para ${totalNumbers} números`);
    
    // Usar WriteTransaction para garantir operação atômica
    const batch = writeBatch(db);
    
    for (let i = 0; i < totalBatches; i++) {
      const batchId = `batch_${i.toString().padStart(4, '0')}`;
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
    
    // Salvar metadados
    const lastBatchId = `batch_${(totalBatches - 1).toString().padStart(4, '0')}`;
    
    batch.set(metadataRef, {
      initialized: true,
      totalBatches,
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
    
    if (!metadataSnap.exists() || !metadataSnap.data().initialized) {
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

export function markNumbersAsSold(generatedNumbers: string[], arg1: { orderId: string; buyerId: string; buyerName: string; sellerId: string; }) {
  throw new Error('Function not implemented.');
}
