import { 
  getPendingOperations, 
  markOperationAsProcessed, 
  updateOrderSyncStatus,
  getOrdersBySyncStatus
} from './offlineStorage';
import { createOrder } from './orders';
import { generateUniqueNumbers, fetchSoldNumbers } from './raffleNumbers';
import type { Order } from '../types/order';

// Sincronizar pedidos offline
export const syncOfflineOrders = async (): Promise<{
  success: boolean,
  synced: number,
  conflicts: number,
  failed: number
}> => {
  console.log('Iniciando sincronização de pedidos offline...');
  
  try {
    // Obter operações pendentes, ordenadas por timestamp (mais antigas primeiro)
    const operations = await getPendingOperations();
    
    if (operations.length === 0) {
      console.log('Nenhuma operação pendente para sincronizar.');
      return { success: true, synced: 0, conflicts: 0, failed: 0 };
    }
    
    console.log(`Encontradas ${operations.length} operações pendentes.`);
    
    let synced = 0;
    let conflicts = 0;
    let failed = 0;
    
    // Processar cada operação pendente
    for (const operation of operations) {
      if (operation.processed) continue;
      
      try {
        if (operation.type === 'create') {
          // Esta é uma operação de criação de pedido
          const orderData = operation.data as Order;
          
          // Verificar se os números ainda estão disponíveis
          const soldNumbers = await fetchSoldNumbers();
          const orderNumbers = orderData.generatedNumbers;
          
          // 1. Identifica apenas os números com conflito (já vendidos)
          const conflictingNumbers = orderNumbers.filter(num => 
            soldNumbers.includes(num)
          );

          // 2. Mantém os números que ainda estão disponíveis
          const nonConflictingNumbers = orderNumbers.filter(num => 
            !soldNumbers.includes(num)
          );

          if (conflictingNumbers.length > 0) {
            console.log(`Detectado conflito nos números: ${conflictingNumbers.join(', ')}`);
            
            // 3. Gera apenas novos números para substituir os conflitantes
            const replacementCount = conflictingNumbers.length;
            const replacementNumbers = await generateUniqueNumbers(replacementCount);
            
            // 4. Combina os não conflitantes com os novos gerados
            const newNumbers = [...nonConflictingNumbers, ...replacementNumbers];
            
            // Criar pedido com os novos números
            const newOrder = {
              ...orderData,
              generatedNumbers: newNumbers
            };
            
            // Salvar no Firebase
            await createOrder(
              newOrder, 
              [newOrder.sellerId], 
              newOrder.sellerName,
              newOrder.sellerUsername
            );
            
            // Atualizar status para conflito resolvido
            await updateOrderSyncStatus(orderData.id, 'conflict', {
              originalNumbers: orderData.generatedNumbers,
              replacementNumbers: newNumbers
            });
            
            // Marcar operação como processada com dados do conflito
            await markOperationAsProcessed(operation.id, {
              originalNumbers: conflictingNumbers,
              replacementNumbers
            });
            
            conflicts++;
          } else {
            // Números ainda disponíveis, criar pedido normalmente
            await createOrder(
              orderData, 
              [orderData.sellerId], 
              orderData.sellerName,
              orderData.sellerUsername
            );
            
            // Atualizar status para sincronizado
            await updateOrderSyncStatus(orderData.id, 'synced');
            
            // Marcar operação como processada
            await markOperationAsProcessed(operation.id);
            
            synced++;
          }
        }
        // Adicionar outros tipos de operações aqui quando necessário
      } catch (error) {
        console.error(`Erro ao processar operação ${operation.id}:`, error);
        failed++;
      }
    }
    
    console.log(`Sincronização concluída: ${synced} sincronizados, ${conflicts} conflitos resolvidos, ${failed} falhas.`);
    
    return {
      success: true,
      synced,
      conflicts,
      failed
    };
  } catch (error) {
    console.error('Erro durante sincronização:', error);
    return {
      success: false,
      synced: 0,
      conflicts: 0,
      failed: 0
    };
  }
};

// Obter pedidos com conflitos resolvidos
export const getResolvedConflicts = async (): Promise<Order[]> => {
  return getOrdersBySyncStatus('conflict');
};
