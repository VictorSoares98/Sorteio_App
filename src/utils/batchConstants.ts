/**
 * Constantes para configuração do sistema de batches de números
 */

// Número de números por batch (500 números em cada documento)
export const NUMBERS_PER_BATCH = 500;

// Total de batches necessários para cobrir todos os números
export const TOTAL_BATCHES = 20; // 10000 / 500 = 20

// Nome da coleção de batches no Firestore
export const BATCH_COLLECTION = 'raffle_batches'; 

// Prefixo para os documentos de batch
export const BATCH_PREFIX = 'batch_';

// Status possíveis para um número dentro de um batch
export const NUMBER_STATUS = {
  AVAILABLE: 'available',
  PENDING: 'pending',
  SOLD: 'sold'
};

// Campo para controle de última atualização
export const LAST_UPDATED_FIELD = 'lastUpdated';

/**
 * Estrutura de um batch no Firestore:
 * {
 *   batchId: 'batch_1',
 *   startNumber: 1,
 *   endNumber: 500,
 *   numbers: {
 *     '00001': { status: 'sold', orderId: 'order123', buyerId: 'user456', soldAt: timestamp },
 *     '00002': { status: 'available' },
 *     ...
 *   },
 *   lastUpdated: timestamp
 * }
 */
