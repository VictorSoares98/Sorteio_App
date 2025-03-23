<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useOrderStore } from '../../stores/orderStore';
import { formatDate } from '../../utils/formatters';
import Card from '../ui/Card.vue';
import type { Order } from '../../types/order';

const orderStore = useOrderStore();
const isLoading = ref(true);
const expandedOrderIds = ref<Set<string>>(new Set());

// Organizar pedidos por data (mais recentes primeiro)
const orders = computed<Order[]>(() => {
  return [...orderStore.userOrders].sort((a, b) => 
    b.createdAt.getTime() - a.createdAt.getTime()
  );
});

// Calcular o total de números vendidos
const totalNumbersSold = computed(() => {
  return orders.value.reduce((total, order) => 
    total + order.generatedNumbers.length, 0
  );
});

// Pesquisa
const searchQuery = ref('');
const filteredOrders = computed<Order[]>(() => {
  if (!searchQuery.value) return orders.value;
  
  const query = searchQuery.value.toLowerCase();
  return orders.value.filter(order => 
    order.buyerName.toLowerCase().includes(query) || 
    order.generatedNumbers.some(num => num.includes(query)) ||
    formatDate(order.createdAt).includes(query)
  );
});

// Expandir/colapsar acordeão
const toggleExpand = (orderId: string) => {
  if (expandedOrderIds.value.has(orderId)) {
    expandedOrderIds.value.delete(orderId);
  } else {
    expandedOrderIds.value.add(orderId);
  }
};

onMounted(async () => {
  if (orderStore.userOrders.length === 0) {
    await orderStore.fetchUserOrders();
  }
  isLoading.value = false;
});
</script>

<template>
  <Card title="Suas Vendas" :subtitle="`Total: ${totalNumbersSold} números vendidos`">
    <div class="p-4">
      <!-- Loading -->
      <div v-if="isLoading || orderStore.loading" class="text-center py-4">
        <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <p class="mt-2">Carregando vendas...</p>
      </div>
      
      <!-- Empty State -->
      <div v-else-if="orders.length === 0" class="text-center py-6 text-gray-500">
        <p>Você ainda não realizou nenhuma venda.</p>
        <router-link to="/" class="text-primary hover:underline block mt-2">
          Criar um pedido
        </router-link>
      </div>
      
      <!-- Content -->
      <div v-else>
        <!-- Search -->
        <div class="mb-4">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por nome do comprador, número ou data..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
          />
        </div>
        
        <!-- Sales Accordion -->
        <div class="space-y-3">
          <div 
            v-for="order in filteredOrders" 
            :key="order.id" 
            class="border rounded-lg overflow-hidden"
          >
            <!-- Accordion Header -->
            <div 
              @click="toggleExpand(order.id)"
              class="p-3 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100"
            >
              <div>
                <h3 class="font-medium">{{ order.buyerName }}</h3>
                <p class="text-xs text-gray-500">{{ formatDate(order.createdAt) }}</p>
              </div>
              <div class="flex items-center">
                <span class="bg-primary text-white px-2 py-1 rounded-full text-xs mr-3">
                  {{ order.generatedNumbers.length }} números
                </span>
                <svg 
                  class="w-5 h-5 text-gray-500 transition-transform"
                  :class="{ 'transform rotate-180': expandedOrderIds.has(order.id) }"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            <!-- Accordion Content -->
            <div 
              v-if="expandedOrderIds.has(order.id)" 
              class="p-3 border-t"
            >
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <p class="text-xs text-gray-500">Forma de Pagamento</p>
                  <p class="text-sm">{{ order.paymentMethod === 'pix' ? 'PIX' : 'Dinheiro' }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500">Contato</p>
                  <p class="text-sm">{{ order.contactNumber }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500">Local</p>
                  <p class="text-sm">{{ order.addressOrCongregation }}</p>
                </div>
                <div v-if="order.observations">
                  <p class="text-xs text-gray-500">Observações</p>
                  <p class="text-sm">{{ order.observations }}</p>
                </div>
              </div>
              
              <div>
                <p class="text-xs text-gray-500 mb-2">Números</p>
                <div class="flex flex-wrap gap-1">
                  <span 
                    v-for="number in order.generatedNumbers" 
                    :key="number"
                    class="bg-primary text-white px-2 py-1 rounded-full text-xs"
                  >
                    {{ number }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- No Results -->
        <div 
          v-if="filteredOrders.length === 0 && searchQuery" 
          class="text-center py-4 text-gray-500"
        >
          Nenhum resultado encontrado para "{{ searchQuery }}"
        </div>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.transition-transform {
  transition: transform 0.2s ease-in-out;
}
</style>
