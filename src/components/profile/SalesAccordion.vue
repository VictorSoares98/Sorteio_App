<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useOrderStore } from '../../stores/orderStore';
import { formatDate } from '../../utils/formatters';
import { calculateTotalSoldNumbers } from '../../utils/orderUtils';
import Card from '../ui/Card.vue';
import type { Order } from '../../types/order';

const orderStore = useOrderStore();
const isLoading = ref(true);
const expandedOrderIds = ref<Set<string>>(new Set());
const isReloading = ref(false);

// Usar diretamente os pedidos ordenados da store
const orders = computed<Order[]>(() => orderStore.userOrders);

// Calcular o total de números vendidos usando a função utilitária
const totalNumbersSold = computed(() => {
  return calculateTotalSoldNumbers(orders.value);
});

// Pesquisa
const searchQuery = ref('');
const filteredOrders = computed<Order[]>(() => {
  if (!searchQuery.value) return orders.value;
  
  const query = searchQuery.value.toLowerCase();
  return orders.value.filter(order => 
    order.buyerName.toLowerCase().includes(query) || 
    (Array.isArray(order.generatedNumbers) && order.generatedNumbers.some(num => num.includes(query))) ||
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

// Função para recarregar os pedidos
const reloadOrders = async () => {
  isReloading.value = true;
  try {
    await orderStore.fetchUserOrders();
    console.log(`[SalesAccordion] Pedidos recarregados: ${orderStore.userOrders.length}`);
  } catch (error) {
    console.error('[SalesAccordion] Erro ao recarregar pedidos:', error);
  } finally {
    isReloading.value = false;
  }
};

onMounted(async () => {
  console.log('[SalesAccordion] Montando componente, verificando pedidos');
  isLoading.value = true;
  try {
    // Sempre buscar os pedidos ao montar o componente para ter dados atualizados
    await orderStore.fetchUserOrders();
    console.log(`[SalesAccordion] ${orderStore.userOrders.length} pedidos carregados`);
  } catch (error) {
    console.error('[SalesAccordion] Erro ao carregar pedidos:', error);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="relative">
    <!-- Botão de reload com posição ajustada para mais abaixo -->
    <button 
      @click="reloadOrders" 
      :disabled="isLoading || isReloading"
      class="absolute top-5 right-4 text-gray-500 hover:text-primary p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-all"
      title="Atualizar lista de vendas"
      aria-label="Atualizar lista de vendas"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        class="h-6 w-6" 
        :class="{ 'animate-spin': isReloading }"
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
        stroke-width="2"
      >
        <path 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
        />
      </svg>
    </button>
    
    <Card title="Suas Vendas" :subtitle="`Total: ${totalNumbersSold} números vendidos`">
      <div class="p-4">
        <!-- Botão "Criar um Pedido" - SEMPRE VISÍVEL -->
        <div class="mb-6 text-center sm:text-right">
          <router-link 
            to="/" 
            class="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Criar um Pedido
          </router-link>
        </div>
        
        <!-- Loading -->
        <div v-if="isLoading || orderStore.loading" class="text-center py-4">
          <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <p class="mt-2">Carregando vendas...</p>
        </div>
        
        <!-- Empty State -->
        <div v-else-if="orders.length === 0" class="text-center py-6 text-gray-500">
          <p>Você ainda não realizou nenhuma venda.</p>
          <p class="text-sm text-gray-400 mt-1">Clique no botão acima para criar seu primeiro pedido!</p>
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
                <div class="flex-1 min-w-0 mr-2">
                  <h3 class="font-medium truncate">{{ order.buyerName }}</h3>
                  <p class="text-xs text-gray-500">{{ formatDate(order.createdAt) }}</p>
                </div>
                <div class="flex items-center flex-shrink-0">
                  <span class="bg-primary text-white px-2 py-1 rounded-full text-xs mr-3 whitespace-nowrap">
                    {{ Array.isArray(order.generatedNumbers) ? order.generatedNumbers.length : 0 }} números
                  </span>
                  <svg 
                    class="w-5 h-5 text-gray-500 transition-transform flex-shrink-0"
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
                    <p class="text-sm truncate">{{ order.contactNumber }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-500">Local</p>
                    <p class="text-sm truncate">{{ order.addressOrCongregation }}</p>
                  </div>
                  <div v-if="order.observations">
                    <p class="text-xs text-gray-500">Observações</p>
                    <p class="text-sm">{{ order.observations }}</p>
                  </div>
                </div>
                
                <div>
                  <p class="text-xs text-gray-500 mb-2">Números</p>
                  <div v-if="Array.isArray(order.generatedNumbers) && order.generatedNumbers.length > 0" 
                       class="flex flex-wrap gap-1">
                    <span 
                      v-for="number in order.generatedNumbers" 
                      :key="number"
                      class="bg-primary text-white px-2 py-1 rounded-full text-xs"
                    >
                      {{ number }}
                    </span>
                  </div>
                  <p v-else class="text-sm text-gray-500 italic">
                    Nenhum número encontrado para este pedido.
                  </p>
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
  </div>
</template>

<style scoped>
.transition-transform {
  transition: transform 0.2s ease-in-out;
}
</style>
