import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type { Order } from '../types/order';

// Nome do banco de dados e versão
const DB_NAME = 'raffleSalesOfflineDB';
const DB_VERSION = 1;

// Interface para uma operação pendente
export interface PendingOperation {
  id: string;
  type: 'create' | 'update';
  data: any;
  timestamp: number;
  processed: boolean;
  conflictResolved?: boolean;
  originalNumbers?: string[];
  replacementNumbers?: string[];
}

// Conexão com o banco de dados
let dbPromise: Promise<IDBPDatabase> | null = null;

// Inicializar o banco de dados
const initDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Criar store para pedidos offline
        if (!db.objectStoreNames.contains('offlineOrders')) {
          const orderStore = db.createObjectStore('offlineOrders', { keyPath: 'id' });
          orderStore.createIndex('createdAt', 'createdAt');
          orderStore.createIndex('syncStatus', 'syncStatus');
        }
        
        // Criar store para operações pendentes
        if (!db.objectStoreNames.contains('pendingOperations')) {
          const opStore = db.createObjectStore('pendingOperations', { keyPath: 'id' });
          opStore.createIndex('timestamp', 'timestamp');
          opStore.createIndex('processed', 'processed');
        }
      }
    });
  }
  
  return dbPromise;
};

// Salvar um pedido para uso offline
export const saveOrderOffline = async (order: Order): Promise<string> => {
  const db = await initDB();
  
  // Adicionar metadados de sincronização ao pedido
  const offlineOrder = {
    ...order,
    syncStatus: 'pending',
    offlineCreatedAt: Date.now() // Timestamp preciso para resolução de conflitos
  };
  
  // Salvar no IndexedDB
  await db.put('offlineOrders', offlineOrder);
  
  // Criar operação pendente
  const operation: PendingOperation = {
    id: `create_${order.id}`,
    type: 'create',
    data: offlineOrder,
    timestamp: Date.now(),
    processed: false
  };
  
  await db.put('pendingOperations', operation);
  
  return order.id;
};

// Obter todos os pedidos offline
export const getOfflineOrders = async (): Promise<Order[]> => {
  const db = await initDB();
  return db.getAll('offlineOrders');
};

// Obter pedidos por status de sincronização
export const getOrdersBySyncStatus = async (status: 'pending' | 'synced' | 'conflict'): Promise<Order[]> => {
  const db = await initDB();
  const index = db.transaction('offlineOrders').store.index('syncStatus');
  return index.getAll(status);
};

// Atualizar status de sincronização de um pedido
export const updateOrderSyncStatus = async (
  orderId: string, 
  status: 'pending' | 'synced' | 'conflict',
  replacementData?: { originalNumbers?: string[], replacementNumbers?: string[] }
): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction('offlineOrders', 'readwrite');
  const order = await tx.store.get(orderId);
  
  if (order) {
    order.syncStatus = status;
    
    // Adicionar informações de substituição se houver conflito
    if (replacementData) {
      order.originalNumbers = replacementData.originalNumbers;
      order.generatedNumbers = replacementData.replacementNumbers;
      order.conflictResolved = true;
    }
    
    await tx.store.put(order);
    await tx.done;
  }
};

// Obter operações pendentes não processadas, ordenadas por timestamp
export const getPendingOperations = async (): Promise<PendingOperation[]> => {
  const db = await initDB();
  const tx = db.transaction('pendingOperations');
  const index = tx.store.index('processed');
  
  const operations = await index.getAll(0); // 0 for false, 1 for true (assuming processed is stored as 0/1) or use IDBKeyRange
  
  // Ordenar por timestamp (mais antigo primeiro)
  return operations.sort((a, b) => a.timestamp - b.timestamp);
};

// Marcar operação como processada
export const markOperationAsProcessed = async (operationId: string, conflictData?: any): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction('pendingOperations', 'readwrite');
  const operation = await tx.store.get(operationId);
  
  if (operation) {
    operation.processed = true;
    
    if (conflictData) {
      operation.conflictResolved = true;
      operation.originalNumbers = conflictData.originalNumbers;
      operation.replacementNumbers = conflictData.replacementNumbers;
    }
    
    await tx.store.put(operation);
    await tx.done;
  }
};

// Limpar operações processadas com mais de 7 dias
export const cleanupProcessedOperations = async (): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction('pendingOperations', 'readwrite');
  const store = tx.store;
  
  const operations = await store.getAll();
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  for (const op of operations) {
    if (op.processed && op.timestamp < oneWeekAgo) {
      await store.delete(op.id);
    }
  }
  
  await tx.done;
};

// Verificar se há pedidos não sincronizados
export const hasUnsyncedOrders = async (): Promise<boolean> => {
  const db = await initDB();
  const count = await db.countFromIndex('offlineOrders', 'syncStatus', 'pending');
  return count > 0;
};
