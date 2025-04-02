<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Card from '../ui/Card.vue';
import LineChart from '../charts/LineChart.vue';
import BarChart from '../charts/BarChart.vue';
import DoughnutChart from '../charts/DoughnutChart.vue';
import StatCard from './StatCard.vue';
import { useOrderStore } from '../../stores/orderStore';
import { fetchOrdersStatistics } from '../../services/orders';

// Stores e States
const orderStore = useOrderStore();
const loading = ref(true);
const error = ref<string | null>(null);

// Dados de estatísticas
const stats = ref({
  totalOrders: 0,
  totalNumbers: 0,
  uniqueBuyers: 0,
  uniqueSellers: 0
});

// Dados para gráficos
const salesByMonthData = ref<{
  labels: string[],
  datasets: {
    label: string,
    backgroundColor: string,
    borderColor: string,
    data: number[]
  }[]
}>({
  labels: [],
  datasets: [
    {
      label: 'Vendas por mês',
      backgroundColor: 'rgba(255, 140, 0, 0.2)',
      borderColor: '#FF8C00',
      data: []
    }
  ]
});

// Type definitions for data structure
interface SellerStats {
  id: string;
  name: string;
  count: number;
}

interface MonthSales {
  [key: string]: number;
}

const topSellersData = ref({
  labels: [] as string[],
  datasets: [
    {
      label: 'Top Vendedores',
      backgroundColor: ['#FF8C00', '#FFA333', '#FFB666', '#FFC999', '#FFDCCC'],
      data: [] as number[]
    }
  ]
});

const numberDistributionData = ref({
  labels: ['Vendidos', 'Disponíveis'],
  datasets: [
    {
      backgroundColor: ['#FF8C00', '#E6E6E6'],
      data: [0, 10000] // Iniciar com 0 vendidos e 10000 disponíveis
    }
  ]
});

// Carregar dados
const loadDashboardData = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    // Carregar estatísticas básicas
    const statistics = await fetchOrdersStatistics();
    stats.value = statistics;
    
    // Atualizar dados de distribuição de números
    numberDistributionData.value.datasets[0].data = [
      statistics.totalNumbers,
      10000 - statistics.totalNumbers
    ];
    
    // Carregar pedidos para análise adicional
    await orderStore.fetchAllOrders();
    
    // Processar dados para gráficos
    processOrdersData(orderStore.orders);
    
  } catch (err) {
    console.error('Erro ao carregar dados do dashboard:', err);
    error.value = 'Erro ao carregar dados do dashboard. Tente novamente mais tarde.';
  } finally {
    loading.value = false;
  }
};

// Processar dados de pedidos para gráficos
const processOrdersData = (orders: any[]) => {
  // Processamento para gráfico de vendas por mês
  const salesByMonth = calculateSalesByMonth(orders);
  salesByMonthData.value.labels = Object.keys(salesByMonth);
  salesByMonthData.value.datasets[0].data = Object.values(salesByMonth);
  
  // Processamento para gráfico de top vendedores
  const sellerStats = calculateTopSellers(orders);
  topSellersData.value.labels = sellerStats.map(s => s.name);
  topSellersData.value.datasets[0].data = sellerStats.map(s => s.count);
};

// Calcular vendas por mês
const calculateSalesByMonth = (orders: any[]): MonthSales => {
  const months: MonthSales = {};
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  // Inicializar últimos 6 meses
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - i);
    const monthKey = `${monthNames[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`;
    months[monthKey] = 0;
  }
  
  // Contar pedidos por mês
  orders.forEach(order => {
    const date = new Date(order.createdAt);
    const monthKey = `${monthNames[date.getMonth()]}/${date.getFullYear().toString().slice(2)}`;
    
    if (months[monthKey] !== undefined) {
      // Adicionar o número de bilhetes vendidos neste pedido
      const numbersSold = order.generatedNumbers?.length || 0;
      months[monthKey] += numbersSold;
    }
  });
  
  return months;
};

// Calcular top vendedores
const calculateTopSellers = (orders: any[]): SellerStats[] => {
  const sellers: Record<string, SellerStats> = {};
  
  // Agrupar por vendedor
  orders.forEach(order => {
    const sellerId = order.sellerId;
    const sellerName = order.sellerName || 'Desconhecido';
    
    if (!sellers[sellerId]) {
      sellers[sellerId] = {
        id: sellerId,
        name: sellerName,
        count: 0
      };
    }
    
    // Adicionar o número de bilhetes vendidos
    sellers[sellerId].count += order.generatedNumbers?.length || 0;
  });
  
  // Ordenar por número de vendas e pegar os top 5
  return Object.values(sellers)
    .sort((a: SellerStats, b: SellerStats) => b.count - a.count)
    .slice(0, 5);
};

// Inicializar ao montar o componente
onMounted(() => {
  loadDashboardData();
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">Dashboard Administrativo</h1>
    
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
      <p>{{ error }}</p>
      <button @click="loadDashboardData" class="mt-2 bg-primary text-white px-4 py-2 rounded">
        Tentar novamente
      </button>
    </div>
    
    <!-- Content when loaded -->
    <div v-else>
      <!-- Stats Cards Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Total de Vendas" 
          :value="stats.totalNumbers" 
          subtitle="números vendidos"
          variant="primary"
        />
        
        <StatCard 
          title="Pedidos" 
          :value="stats.totalOrders" 
          subtitle="pedidos realizados"
          variant="secondary"
        />
        
        <StatCard 
          title="Compradores" 
          :value="stats.uniqueBuyers" 
          subtitle="compradores únicos"
          variant="success"
        />
        
        <StatCard 
          title="Vendedores" 
          :value="stats.uniqueSellers" 
          subtitle="vendedores ativos"
          variant="info"
        />
      </div>
      
      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Sales Trend Chart -->
        <Card title="Tendência de Vendas">
          <div class="p-4">
            <div class="h-40 sm:h-48 md:h-56 lg:h-64 w-full flex items-center justify-center">
              <div class="w-full">
                <LineChart :chart-data="salesByMonthData" />
              </div>
            </div>
          </div>
        </Card>
        
        <!-- Top Sellers Chart -->
        <Card title="Top Vendedores">
          <div class="p-4">
            <div class="h-40 sm:h-48 md:h-56 lg:h-64 w-full flex items-center justify-center">
              <div class="w-full">
                <BarChart :chart-data="topSellersData" />
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      <!-- Additional Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Numbers Distribution -->
        <Card title="Distribuição de Números" class="h-full">
          <div class="p-4 h-full">
            <div class="h-40 sm:h-48 md:h-56 lg:h-64 w-full flex items-center justify-center">
              <div class="max-w-[200px] sm:max-w-[250px] md:max-w-[220px] lg:max-w-none w-full">
                <DoughnutChart :chart-data="numberDistributionData" />
              </div>
            </div>
          </div>
        </Card>
        
        <!-- Recent Activity/Updates -->
        <div class="lg:col-span-2">
          <Card title="Atividade Recente">
            <div class="p-4">
              <p class="text-gray-600">
                Este painel mostra estatísticas do sorteio. Use os gráficos para
                acompanhar as vendas de números e monitorar a distribuição dos bilhetes.
              </p>
              <div class="mt-4">
                <button 
                  @click="loadDashboardData" 
                  class="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded transition-colors"
                >
                  Atualizar Dados
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>
