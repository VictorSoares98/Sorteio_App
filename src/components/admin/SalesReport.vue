<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { fetchSalesReport } from '../../services/admin';
import Card from '../ui/Card.vue';

const loading = ref(true);
const error = ref<string | null>(null);

const reportData = ref<{
  totalOrders: number;
  totalSoldNumbers: number;
  uniqueBuyers: number;
  recentOrders: any[];
  topSellers: { id: string, count: number }[];
}>({
  totalOrders: 0,
  totalSoldNumbers: 0,
  uniqueBuyers: 0,
  recentOrders: [],
  topSellers: []
});

const loadReportData = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const data = await fetchSalesReport();
    reportData.value = data;
  } catch (err: any) {
    console.error('Erro ao carregar relatório:', err);
    error.value = err.message || 'Não foi possível carregar o relatório de vendas.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadReportData();
});

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold mb-4">Relatório de Vendas</h2>
    
    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p class="mt-2">Carregando relatórios...</p>
    </div>
    
    <!-- Error -->
    <div v-else-if="error" class="text-center py-8 bg-red-50 rounded-lg border border-red-200 text-danger">
      <p class="font-medium">{{ error }}</p>
      <button 
        @click="loadReportData" 
        class="mt-3 bg-primary text-white px-4 py-2 rounded"
      >
        Tentar novamente
      </button>
    </div>
    
    <!-- Content -->
    <div v-else>
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div class="text-center p-4">
            <h3 class="text-gray-600 text-sm uppercase font-semibold">Total de Pedidos</h3>
            <p class="text-3xl font-bold text-primary mt-2">{{ reportData.totalOrders }}</p>
          </div>
        </Card>
        
        <Card>
          <div class="text-center p-4">
            <h3 class="text-gray-600 text-sm uppercase font-semibold">Números Vendidos</h3>
            <p class="text-3xl font-bold text-primary mt-2">{{ reportData.totalSoldNumbers }}</p>
          </div>
        </Card>
        
        <Card>
          <div class="text-center p-4">
            <h3 class="text-gray-600 text-sm uppercase font-semibold">Compradores Únicos</h3>
            <p class="text-3xl font-bold text-primary mt-2">{{ reportData.uniqueBuyers }}</p>
          </div>
        </Card>
      </div>
      
      <!-- Recent Orders -->
      <div class="mb-8">
        <Card title="Pedidos Recentes">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comprador
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Números
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="order in reportData.recentOrders" :key="order.id">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {{ order.buyerName }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ order.sellerName }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ order.generatedNumbers.length }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ formatDate(order.createdAt) }}
                  </td>
                </tr>
                
                <tr v-if="reportData.recentOrders.length === 0">
                  <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                    Nenhum pedido encontrado
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      
      <!-- Top Sellers -->
      <Card title="Top Vendedores">
        <div class="px-4 py-2">
          <ul class="divide-y divide-gray-200">
            <li v-for="(seller, index) in reportData.topSellers" :key="seller.id" class="py-3 flex items-center">
              <div class="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold mr-3">
                {{ index + 1 }}
              </div>
              <div class="flex-grow">
                <span class="font-medium">Vendedor ID: {{ seller.id }}</span>
              </div>
              <div class="text-right">
                <span class="bg-primary text-white px-3 py-1 rounded-full text-sm">
                  {{ seller.count }} vendas
                </span>
              </div>
            </li>
            
            <li v-if="reportData.topSellers.length === 0" class="py-3 text-center text-gray-500">
              Nenhum dado de vendedor disponível
            </li>
          </ul>
        </div>
      </Card>
    </div>
  </div>
</template>
