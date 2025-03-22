import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { collection, query, where, getDocs, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from './authStore';
import { Order, OrderFormData, PaymentMethod } from '../types/order';

export const useOrderStore = defineStore('order', () => {
  const orders = ref<Order[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const authStore = useAuthStore();

  const userOrders = computed(() => {
    if (!authStore.currentUser) return [];
    
    // Retorna apenas pedidos do usuário atual
    return orders.value.filter(order => order.sellerId === authStore.currentUser?.id);
  });

  // Buscar todos os pedidos do usuário
  const fetchUserOrders = async () => {
    if (!authStore.currentUser) return;
    
    loading.value = true;
    orders.value = [];
    error.value = null;
    
    try {
      const userId = authStore.currentUser.id;
      const ordersQuery = query(
        collection(db, 'orders'), 
        where('sellerId', '==', userId)
      );
      
      const querySnapshot = await getDocs(ordersQuery);
      const fetchedOrders: Order[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        
        fetchedOrders.push({
          ...data,
          createdAt
        } as Order);
      });
      
      // Ordena pedidos por data (mais recente primeiro)
      orders.value = fetchedOrders.sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );
      
    } catch (err: any) {
      console.error('Erro ao buscar pedidos:', err);
      error.value = 'Não foi possível carregar seus pedidos.';
    } finally {
      loading.value = false;
    }
  };

  // Criar novo pedido
  const createOrder = async (orderData: OrderFormData, generatedNumbers: string[]) => {
    if (!authStore.currentUser) throw new Error('Usuário não autenticado');
    
    loading.value = true;
    error.value = null;
    
    try {
      const newOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      // Preparar dados do pedido
      const newOrder: Order = {
        id: newOrderId,
        buyerName: orderData.buyerName,
        paymentMethod: orderData.paymentMethod,
        contactNumber: orderData.contactNumber,
        addressOrCongregation: orderData.addressOrCongregation,
        observations: orderData.observations,
        generatedNumbers: generatedNumbers,
        sellerName: authStore.currentUser.displayName,
        sellerId: authStore.currentUser.id,
        createdAt: new Date()
      };
      
      // Salvar pedido no Firestore
      await setDoc(doc(db, 'orders', newOrderId), {
        ...newOrder,
        createdAt: serverTimestamp() 
      });
      
      // Adicionar pedido ao estado local
      orders.value.unshift(newOrder);
      
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
    createOrder
  };
});
