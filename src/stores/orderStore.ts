import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from './authStore';
import { PaymentMethod, type Order, type OrderFormData } from '../types/order';
import * as orderService from '../services/orders';

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
    error.value = null;
    
    try {
      const userId = authStore.currentUser.id;
      const fetchedOrders = await orderService.fetchUserOrders(userId);
      orders.value = fetchedOrders;
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
    
    // Remover o código que define PaymentMethod padrão
    // A validação no formulário já garante que paymentMethod estará definido
    
    loading.value = true;
    error.value = null;
    
    try {
      // Usar o serviço ao invés de reimplementar lógica
      const newOrderId = await orderService.createOrder(
        orderData,
        generatedNumbers,
        authStore.currentUser.id,
        authStore.currentUser.displayName
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
    createOrder
  };
});
