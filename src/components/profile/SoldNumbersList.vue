<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useOrderStore } from '../../stores/orderStore';
import Card from '../ui/Card.vue';
import { formatDate } from '../../utils/formatters';

const orderStore = useOrderStore();
const isLoading = ref(true);
const debugMode = ref(false);

// Lista de números ordenados por data de venda (mais recentes primeiro)
const soldNumbers = computed(() => {
  const allNumbers: { number: string, buyerName: string, date: Date }[] = [];
  
  console.log(`[SoldNumbersList] Processando ${orderStore.userOrders.length} pedidos`);
  
  orderStore.userOrders.forEach(order => {
    if (!order.generatedNumbers) {
      console.warn(`[SoldNumbersList] Pedido sem números gerados: ${order.id}`);
      return;
    }
    
    // Validar que generatedNumbers é um array antes de iterar
    if (Array.isArray(order.generatedNumbers)) {
      order.generatedNumbers.forEach(number => {
        allNumbers.push({
          number,
          buyerName: order.buyerName,
          date: order.createdAt
        });
      });
    } else {
      console.warn(`[SoldNumbersList] generatedNumbers não é array no pedido: ${order.id}`);
    }
  });
  
  console.log(`[SoldNumbersList] Total de números processados: ${allNumbers.length}`);
  
  // Ordenar por data mais recente primeiro
  return allNumbers.sort((a, b) => b.date.getTime() - a.date.getTime());
});

// Total de números vendidos
const totalSold = computed(() => soldNumbers.value.length);

// Filtro
const searchQuery = ref('');
const filteredNumbers = computed(() => {
  if (!searchQuery.value) return soldNumbers.value;
  
  const query = searchQuery.value.toLowerCase();
  return soldNumbers.value.filter(item => 
    item.number.includes(query) || 
    item.buyerName.toLowerCase().includes(query)
  );
});

// Toggle modo de depuração
const toggleDebugMode = () => {
  debugMode.value = !debugMode.value;
};

// Forçar recarga dos pedidos
const reloadOrders = async () => {
  isLoading.value = true;
  try {
    await orderStore.fetchUserOrders();
    console.log(`[SoldNumbersList] Recarregados ${orderStore.userOrders.length} pedidos`);
  } catch (error) {
    console.error('[SoldNumbersList] Erro ao recarregar pedidos:', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  console.log('[SoldNumbersList] Componente montado');
  if (orderStore.orders.length === 0) {
    console.log('[SoldNumbersList] Nenhum pedido encontrado, carregando...');
    await orderStore.fetchUserOrders();
  } else {
    console.log(`[SoldNumbersList] ${orderStore.orders.length} pedidos já carregados`);
  }
  isLoading.value = false;
});
</script>

<template>
  <Card title="Números Vendidos" :subtitle="`Total: ${totalSold}`" class="mb-6">
    <div class="p-4">
      <!-- Debug Toggle -->
      <div class="flex justify-between mb-2">
        <button 
          @click="reloadOrders" 
          class="text-xs bg-gray-100 hover:bg-gray-200 py-1 px-2 rounded text-gray-600"
        >
          Recarregar
        </button>
        
        <button @click="toggleDebugMode" class="text-xs text-gray-400 hover:text-primary">
          {{ debugMode ? 'Ocultar Debug' : 'Debug' }}
        </button>
      </div>
      
      <!-- Debug Info -->
      <pre v-if="debugMode" class="text-xs mb-4 p-2 bg-gray-100 rounded overflow-auto text-left">
        <span class="font-bold">Pedidos: {{ orderStore.userOrders.length }}</span>
        <span class="font-bold">Números vendidos: {{ totalSold }}</span>
        {{ JSON.stringify(orderStore.userOrders.map(o => ({
          id: o.id,
          buyerName: o.buyerName,
          sellerId: o.sellerId,
          originalSellerId: o.originalSellerId,
          numbersCount: o.generatedNumbers?.length
        })), null, 2) }}
      </pre>

      <!-- Loading -->
      <div v-if="isLoading || orderStore.loading" class="text-center py-4">
        <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <p class="mt-2">Carregando números...</p>
      </div>
      
      <!-- Empty State -->
      <div v-else-if="totalSold === 0" class="text-center py-6 text-gray-500">
        <p>Você ainda não vendeu nenhum número.</p>
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
            placeholder="Buscar por número ou nome do comprador..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
          />
        </div>
        
        <!-- Numbers List -->
        <div class="divide-y divide-gray-200">
          <div 
            v-for="(item, index) in filteredNumbers" 
            :key="`${item.number}-${index}`"
            class="py-3 flex justify-between items-center"
          >
            <div class="flex items-center">
              <span class="bg-primary text-white px-3 py-1 rounded-full mr-3">
                {{ item.number }}
              </span>
              <div>
                <p class="font-medium">{{ item.buyerName }}</p>
                <p class="text-xs text-gray-500">{{ formatDate(item.date) }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- No Results -->
        <div 
          v-if="filteredNumbers.length === 0 && searchQuery" 
          class="text-center py-4 text-gray-500"
        >
          Nenhum resultado encontrado para "{{ searchQuery }}"
        </div>
      </div>
    </div>
  </Card>
</template>
