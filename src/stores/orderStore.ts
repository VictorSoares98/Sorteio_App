import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from './authStore';
import { type Order, type OrderFormData } from '../types/order';
import * as orderService from '../services/orders';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

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

  // Buscar todos os pedidos do usuário
  const fetchUserOrders = async () => {
    if (!authStore.currentUser) return;
    
    loading.value = true;
    error.value = null;
    
    try {
      const userId = authStore.currentUser.id;
      console.log(`[OrderStore] Buscando pedidos para usuário: ${userId}`);
      
      // Garantir que estamos usando o serviço correto para buscar pedidos
      const fetchedOrders = await orderService.fetchUserOrders(userId);
      console.log(`[OrderStore] ${fetchedOrders.length} pedidos encontrados no Firebase`);
      
      // Validar que todos os pedidos têm o formato correto antes de armazenar
      orders.value = fetchedOrders.map(order => {
        // Garantir que createdAt é um objeto Date válido
        if (!(order.createdAt instanceof Date) || isNaN(order.createdAt.getTime())) {
          console.warn('[OrderStore] Data inválida detectada em pedido, corrigindo:', order.id);
          order.createdAt = new Date();
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
      
      console.log(`[OrderStore] ${orders.value.length} pedidos carregados para o usuário ${userId}`);
      console.log(`[OrderStore] ${userOrders.value.length} pedidos filtrados para o usuário atual`);
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

  // Criar novo pedido - removida confirmação em lote
  const createOrder = async (orderData: OrderFormData, generatedNumbers: string[]) => {
    if (!authStore.currentUser) throw new Error('Usuário não autenticado');
    
    loading.value = true;
    error.value = null;
    
    try {
      // Verificar se o username está disponível
      const username = authStore.currentUser.username || authStore.currentUser.displayName.toLowerCase().replace(/\s+/g, "_");
      
      // Criar pedido no Firebase
      const newOrderId = await orderService.createOrder(
        orderData,
        generatedNumbers,
        authStore.currentUser.id,
        authStore.currentUser.displayName,
        username
      );
      
      // Atualizar a store após criar o pedido
      await fetchUserOrders();
      
      return newOrderId;
    } catch (err: any) {
      console.error('Erro ao criar pedido:', err);
      error.value = err.message || 'Erro ao criar pedido. Tente novamente.';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    orders,
    userOrders,
    loading,
    error,
    fetchUserOrders,
    fetchAllOrders,
    createOrder
  };
});
