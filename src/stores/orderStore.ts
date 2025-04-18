import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from './authStore';
import { type Order, type OrderFormData } from '../types/order';
import { collection, getDocs, query, where, orderBy, doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useConnectionStatus } from '../services/connectivity';

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

  // Estado de conexão
  const { isOnline } = useConnectionStatus();
  const pendingOrdersCount = ref(0);

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

  // Buscar todos os pedidos do usuário usando onSnapshot para dados em tempo real
  const fetchUserOrders = async () => {
    if (!authStore.currentUser) return;
    
    loading.value = true;
    error.value = null;
    
    try {
      const userId = authStore.currentUser.id;
      console.log(`[OrderStore] Buscando pedidos para usuário: ${userId}`);
      
      // Usar onSnapshot para obter atualizações em tempo real (funciona offline também)
      const ordersQuery1 = query(
        collection(db, 'orders'),
        where('originalSellerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const ordersQuery2 = query(
        collection(db, 'orders'),
        where('sellerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      // Executar primeiro query
      onSnapshot(ordersQuery1, (snapshot) => {
        const ordersFromQuery1 = new Map();
        
        snapshot.forEach((doc) => {
          const orderData = processFirestoreDocument<Order>(doc);
          ordersFromQuery1.set(orderData.id, orderData);
        });
        
        // Atualizar state depois de ambas as consultas (continuará no segundo onSnapshot)
        updateOrdersFromSnapshots(ordersFromQuery1);
      }, (error) => {
        console.error('[OrderStore] Erro ao observar pedidos (query1):', error);
      });
      
      // Executar segundo query
      onSnapshot(ordersQuery2, (snapshot) => {
        const ordersFromQuery2 = new Map();
        
        snapshot.forEach((doc) => {
          const orderData = processFirestoreDocument<Order>(doc);
          ordersFromQuery2.set(orderData.id, orderData);
        });
        
        // Atualizar state
        updateOrdersFromSnapshots(ordersFromQuery2);
      }, (error) => {
        console.error('[OrderStore] Erro ao observar pedidos (query2):', error);
      });
      
      // Observar status de conectividade do Firestore para contar pedidos pendentes
      onSnapshot(doc(db, '.info', 'connectivityState'), (snapshot) => {
        const data = snapshot.data();
        if (data) {
          pendingOrdersCount.value = data.pendingWrites || 0;
        }
      }, (error) => {
        console.error('[OrderStore] Erro ao observar estado de conectividade:', error);
      });
      
    } catch (err: any) {
      console.error('[OrderStore] Erro ao configurar observadores de pedidos:', err);
      error.value = 'Não foi possível carregar seus pedidos.';
    } finally {
      loading.value = false;
    }
  };
  
  // Função auxiliar para atualizar orders de snapshots
  const updateOrdersFromSnapshots = (ordersMap: Map<string, Order>) => {
    // Combinar com pedidos existentes (preservando os que não vieram nesta consulta)
    const updatedOrdersMap = new Map(orders.value.map(o => [o.id, o]));
    
    // Adicionar/atualizar pedidos recém buscados
    ordersMap.forEach((order, id) => {
      updatedOrdersMap.set(id, order);
    });
    
    // Converter de volta para array e ordenar
    orders.value = Array.from(updatedOrdersMap.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
    console.log(`[OrderStore] ${orders.value.length} pedidos atualizados`);
  };

  // Criar pedido - funciona online e offline com persistência do Firestore
  const createOrder = async (orderData: OrderFormData, generatedNumbers: string[]) => {
    if (!authStore.currentUser) throw new Error('Usuário não autenticado');
    
    loading.value = true;
    error.value = null;
    
    try {
      // Verificar se o username está disponível
      const username = authStore.currentUser.username || authStore.currentUser.displayName.toLowerCase().replace(/\s+/g, "_");
      
      // Garantir que paymentMethod está definido
      if (orderData.paymentMethod === undefined) {
        throw new Error('É necessário selecionar uma forma de pagamento');
      }
      
      // Preparar dados do pedido com formato padronizado
      const newOrderId = generateDocumentId('order', username);
      const sellerNameId = `seller_${username}`;
      
      // Timestamp atual para uso offline
      const currentTimestamp = new Date();
      const offlineTimestamp = Date.now();
      
      // Preparar objeto para salvar no Firestore
      const orderObject = {
        id: newOrderId,
        buyerName: orderData.buyerName,
        paymentMethod: orderData.paymentMethod,
        contactNumber: orderData.contactNumber,
        addressOrCongregation: orderData.addressOrCongregation,
        observations: orderData.observations || '',
        numTickets: orderData.numTickets || generatedNumbers.length,
        generatedNumbers: [...generatedNumbers],
        sellerName: authStore.currentUser.displayName,
        sellerId: sellerNameId,
        originalSellerId: authStore.currentUser.id,
        sellerUsername: username,
        offlineCreatedAt: offlineTimestamp
      };
      
      // Salvar diretamente no Firestore com o timestamp apropriado para o modo atual
      if (isOnline.value) {
        // Online: usar serverTimestamp() para consistência
        await setDoc(doc(db, 'orders', newOrderId), {
          ...orderObject,
          createdAt: serverTimestamp()
        });
      } else {
        // Offline: usar timestamp local (será reconciliado depois)
        await setDoc(doc(db, 'orders', newOrderId), {
          ...orderObject,
          createdAt: currentTimestamp
        });
      }
      
      console.log(`[OrderStore] Pedido ${newOrderId} criado com sucesso${!isOnline.value ? ' (offline)' : ''}`);
      
      return newOrderId;
    } catch (err: any) {
      console.error('[OrderStore] Erro ao criar pedido:', err);
      error.value = err.message || 'Erro ao criar pedido. Tente novamente.';
      throw err;
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

  // Adicionar novos métodos para buscar pedidos por vendedores específicos
  const fetchOrdersBySellerIds = async (sellerIds: string[]) => {
    if (!sellerIds || sellerIds.length === 0) return [];
    
    loading.value = true;
    error.value = null;
    
    try {
      const ordersRef = collection(db, 'orders');
      
      // Dividir em chunks para respeitar limites do Firestore
      const chunkSize = 10;
      let fetchedOrders: Order[] = [];
      
      for (let i = 0; i < sellerIds.length; i += chunkSize) {
        const chunk = sellerIds.slice(i, i + chunkSize);
        
        // Query para buscar pedidos onde sellerId está no array de vendedores
        const q1 = query(ordersRef, where('sellerId', 'in', chunk));
        const snapshot1 = await getDocs(q1);
        
        // Query para buscar pedidos onde originalSellerId está no array de vendedores
        const q2 = query(ordersRef, where('originalSellerId', 'in', chunk));
        const snapshot2 = await getDocs(q2);
        
        // Processar resultados da primeira query
        snapshot1.forEach(doc => {
          const orderData = processFirestoreDocument<Order>(doc);
          if (!fetchedOrders.some(order => order.id === orderData.id)) {
            fetchedOrders.push(orderData);
          }
        });
        
        // Processar resultados da segunda query
        snapshot2.forEach(doc => {
          const orderData = processFirestoreDocument<Order>(doc);
          if (!fetchedOrders.some(order => order.id === orderData.id)) {
            fetchedOrders.push(orderData);
          }
        });
      }
      
      // Adicionar os novos pedidos ao estado, evitando duplicatas
      const uniqueOrderIds = new Set(orders.value.map(o => o.id));
      const newOrders = fetchedOrders.filter(o => !uniqueOrderIds.has(o.id));
      
      if (newOrders.length > 0) {
        orders.value = [...orders.value, ...newOrders];
      }
      
      return fetchedOrders;
    } catch (err: any) {
      console.error('Erro ao buscar pedidos por vendedores:', err);
      error.value = err.message || 'Falha ao carregar pedidos.';
      return [];
    } finally {
      loading.value = false;
    }
  };

  // Obter pedidos específicos de vendedores do estado atual
  const getOrdersBySellerIds = (sellerIds: string[]): Order[] => {
    const sellerIdSet = new Set(sellerIds);
    return orders.value.filter(order => 
      (order.sellerId && sellerIdSet.has(order.sellerId)) || 
      (order.originalSellerId && sellerIdSet.has(order.originalSellerId))
    );
  };

  // Inicializar busca de pedidos
  if (authStore.currentUser) {
    fetchUserOrders();
  }

  return {
    orders,
    userOrders,
    loading,
    error,
    fetchUserOrders,
    fetchAllOrders,
    createOrder,
    pendingOrdersCount,
    isOnline,
    fetchOrdersBySellerIds,
    getOrdersBySellerIds
  };
});

function generateDocumentId(prefix: string, username: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${username}_${timestamp}_${randomStr}`;
}

