import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from './authStore';
import { type Order, type OrderFormData, PaymentMethod } from '../types/order';
import * as orderService from '../services/orders';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  saveOrderOffline, 
  getOfflineOrders, 
  hasUnsyncedOrders 
} from '../services/offlineStorage';
import { useConnectionStatus } from '../services/connectivity';
import { syncOfflineOrders } from '../services/syncService';

// Utility function to process Firestore document
const processFirestoreDocument = <T>(doc: any): T => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date()
  } as T;
};

export const useOrderStore = defineStore('order', () => {
  const orders = ref<Order[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const authStore = useAuthStore();

  // Adicionar novos estados para modo offline
  const unsyncedOrdersCount = ref(0);
  const { isOnline, connectionStatus } = useConnectionStatus();
  const syncInProgress = ref(false);
  const lastSyncResult = ref<any>(null);

  // Computar os pedidos do usuário atual
  const userOrders = computed(() => {
    if (!authStore.currentUser) return [];
    
    const userId = authStore.currentUser.id;
    
    // Incluir todos os pedidos onde o usuário é o vendedor (usando ambos os IDs)
    return orders.value
      .filter(order => {
        // Verifica se é o vendedor usando originalSellerId OU sellerId
        return (order.originalSellerId === userId) || (order.sellerId === userId);
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  });

  // Verificar se há pedidos não sincronizados ao iniciar
  const checkUnsyncedOrders = async () => {
    try {
      const hasUnsynced = await hasUnsyncedOrders();
      if (hasUnsynced) {
        const offlineOrders = await getOfflineOrders();
        unsyncedOrdersCount.value = offlineOrders.filter(o => o.syncStatus === 'pending').length;
      } else {
        unsyncedOrdersCount.value = 0;
      }
    } catch (err) {
      console.error('[OrderStore] Erro ao verificar pedidos não sincronizados:', err);
    }
  };

  // Buscar todos os pedidos do usuário, incluindo offline
  const fetchUserOrders = async () => {
    if (!authStore.currentUser) return;
    
    loading.value = true;
    error.value = null;
    
    try {
      const userId = authStore.currentUser.id;
      console.log(`[OrderStore] Buscando pedidos para usuário: ${userId}`);
      
      // Buscar pedidos do Firebase
      let fetchedOrders: Order[] = [];
      
      if (isOnline.value) {
        fetchedOrders = await orderService.fetchUserOrders(userId);
        console.log(`[OrderStore] ${fetchedOrders.length} pedidos encontrados no Firebase`);
      }
      
      // Buscar pedidos offline
      const offlineOrders = await getOfflineOrders();
      console.log(`[OrderStore] ${offlineOrders.length} pedidos encontrados offline`);
      
      // Combinar pedidos online e offline, evitando duplicatas
      const onlineOrderIds = new Set(fetchedOrders.map(o => o.id));
      const filteredOfflineOrders = offlineOrders.filter(o => !onlineOrderIds.has(o.id));
      
      const allOrders = [...fetchedOrders, ...filteredOfflineOrders];
      
      // Validar todos os pedidos
      orders.value = allOrders.map(order => {
        // Garantir que createdAt é um objeto Date válido
        if (!(order.createdAt instanceof Date) || isNaN(order.createdAt.getTime())) {
          console.warn('[OrderStore] Data inválida detectada em pedido, corrigindo:', order.id);
          order.createdAt = new Date(order.offlineCreatedAt || Date.now());
        }
        
        // Garantir que generatedNumbers é sempre um array
        if (!Array.isArray(order.generatedNumbers)) {
          console.warn('[OrderStore] Array de números inválido detectado, corrigindo:', order.id);
          order.generatedNumbers = [];
        }
        
        // Garantir que originalSellerId está definido para compatibilidade
        if (!order.originalSellerId) {
          order.originalSellerId = order.sellerId;
        }
        
        return order;
      });
      
      // Ordenar por data mais recente
      orders.value.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Atualizar contagem de pedidos não sincronizados
      unsyncedOrdersCount.value = offlineOrders.filter(o => o.syncStatus === 'pending').length;
      
      console.log(`[OrderStore] ${orders.value.length} pedidos carregados para o usuário ${userId}`);
    } catch (err: any) {
      console.error('[OrderStore] Erro ao buscar pedidos:', err);
      error.value = 'Não foi possível carregar seus pedidos.';
    } finally {
      loading.value = false;
    }
  };

  // Buscar todos os pedidos (para administradores)
  const fetchAllOrders = async () => {
    if (!authStore.isAdmin) {
      console.warn('[OrderStore] Tentativa de acesso não autorizado a todos os pedidos');
      error.value = 'Permissão negada. Apenas administradores podem acessar todos os pedidos.';
      return [];
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      console.log('[OrderStore] Buscando todos os pedidos');
      
      // Buscar todos os pedidos do sistema
      const ordersRef = collection(db, 'orders');
      const ordersSnapshot = await getDocs(ordersRef);
      
      const allOrders: Order[] = [];
      
      ordersSnapshot.forEach((doc) => {
        // Usar função utilitária para processar documentos
        const order = processFirestoreDocument<Order>(doc);
        
        // Validar datas
        if (!(order.createdAt instanceof Date) || isNaN(order.createdAt.getTime())) {
          order.createdAt = new Date();
        }
        
        // Validar array de números
        if (!Array.isArray(order.generatedNumbers)) {
          order.generatedNumbers = [];
        }
        
        allOrders.push(order);
      });
      
      // Ordenar por data mais recente primeiro
      orders.value = allOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      console.log(`[OrderStore] ${orders.value.length} pedidos carregados`);
      return orders.value;
    } catch (err: any) {
      console.error('[OrderStore] Erro ao buscar todos os pedidos:', err);
      error.value = 'Não foi possível carregar os pedidos.';
      return [];
    } finally {
      loading.value = false;
    }
  };

  // Modificar a função createOrder para suportar modo offline
  const createOrder = async (orderData: OrderFormData, generatedNumbers: string[]) => {
    if (!authStore.currentUser) throw new Error('Usuário não autenticado');
    
    loading.value = true;
    error.value = null;
    
    try {
      // Verificar se o username está disponível
      const username = authStore.currentUser.username || authStore.currentUser.displayName.toLowerCase().replace(/\s+/g, "_");
      
      // Preparar dados do pedido
      const newOrderId = generateDocumentId('order', username);
      const timestamp = Date.now();
      
      const orderToCreate = {
        id: newOrderId,
        buyerName: orderData.buyerName,
        paymentMethod: orderData.paymentMethod || PaymentMethod.DINHEIRO,
        contactNumber: orderData.contactNumber,
        addressOrCongregation: orderData.addressOrCongregation,
        observations: orderData.observations,
        numTickets: orderData.numTickets,
        generatedNumbers,
        sellerName: authStore.currentUser.displayName,
        sellerId: authStore.currentUser.id,
        originalSellerId: authStore.currentUser.id,
        sellerUsername: username,
        createdAt: new Date(),
        
        // Campos para modo offline
        offlineCreatedAt: timestamp
      };
      
      // Se estiver online, criar diretamente no Firebase
      if (isOnline.value) {
        await orderService.createOrder(
          orderData,
          generatedNumbers,
          authStore.currentUser.id,
          authStore.currentUser.displayName,
          username
        );
        
        // Atualizar a store após criar o pedido
        await fetchUserOrders();
      } else {
        // Modo offline: salvar localmente
        console.log('[OrderStore] Modo offline ativo. Salvando pedido localmente.');
        await saveOrderOffline(orderToCreate as Order);
        
        // Adicionar ao estado local para exibição imediata
        const ordersWithNew = [orderToCreate as Order, ...orders.value];
        orders.value = ordersWithNew;
        
        // Atualizar contagem de pedidos não sincronizados
        unsyncedOrdersCount.value += 1;
      }
      
      return newOrderId;
    } catch (err: any) {
      console.error('[OrderStore] Erro ao criar pedido:', err);
      error.value = err.message || 'Erro ao criar pedido. Tente novamente.';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Iniciar sincronização manual
  const syncOrders = async () => {
    if (!isOnline.value) {
      error.value = 'Você está offline. A sincronização será realizada automaticamente quando a conexão for restaurada.';
      return false;
    }
    
    syncInProgress.value = true;
    error.value = null;
    
    try {
      const result = await syncOfflineOrders();
      lastSyncResult.value = result;
      
      // Recarregar os pedidos após sincronização
      await fetchUserOrders();
      
      return result.success;
    } catch (err: any) {
      console.error('[OrderStore] Erro ao sincronizar pedidos:', err);
      error.value = err.message || 'Não foi possível sincronizar os pedidos.';
      return false;
    } finally {
      syncInProgress.value = false;
    }
  };

  // Inicializar verificação de pedidos offline
  checkUnsyncedOrders();

  return {
    orders,
    userOrders,
    loading,
    error,
    fetchUserOrders,
    fetchAllOrders,
    createOrder,
    unsyncedOrdersCount,
    connectionStatus,
    syncInProgress,
    lastSyncResult,
    syncOrders,
    checkUnsyncedOrders
  };
});
function generateDocumentId(prefix: string, username: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${username}_${timestamp}_${randomStr}`;
}

