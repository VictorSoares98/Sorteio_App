<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import DateRangeSelector from './DateRangeSelector.vue';
import { fetchSalesReportWithDateRange, type ComparativeSalesReport } from '../../services/admin';
import StatCard from '../dashboard/StatCard.vue';
import Card from '../ui/Card.vue';
import LineChart from '../charts/LineChart.vue';
import BarChart from '../charts/BarChart.vue';
import DoughnutChart from '../charts/DoughnutChart.vue';
import Alert from '../ui/Alert.vue';
import { aggregateByTimePeriod, predictSales } from '../../utils/aggregationUtils';

// Estados
const isLoading = ref(true);
const error = ref<string | null>(null);
const reportData = ref<ComparativeSalesReport | null>(null);
const dateRange = ref<{ startDate: Date; endDate: Date; cacheKey: string } | null>(null);
const showPredictions = ref(false);

// Dados para gráficos
const salesTimeSeriesData = computed(() => {
  if (!reportData.value) return { labels: [], datasets: [] };
  
  // Extrair dados de vendas por dia
  const currentData = reportData.value.current.salesByDay;
  const dataPoints = Object.entries(currentData).map(([date, value]) => ({
    timestamp: new Date(date),
    value
  }));
  
  // Determinar agregação com base no intervalo de dias
  let aggregation: 'day' | 'week' | 'month' = 'day';
  
  if (dateRange.value) {
    const days = Math.round((dateRange.value.endDate.getTime() - dateRange.value.startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (days > 60) {
      aggregation = 'month';
    } else if (days > 21) {
      aggregation = 'week';
    }
  }
  
  // Agregar dados por período
  const aggregatedData = aggregateByTimePeriod(dataPoints, aggregation);
  
  // Dados de previsão apenas se solicitado
  const predictionDataset = [];
  if (showPredictions.value) {
    // Gerar previsão para 7 dias
    const predictions = predictSales(dataPoints, 7);
    if (predictions.length > 0) {
      const predictedData = aggregateByTimePeriod(predictions, 'day');
      
      predictionDataset.push({
        label: 'Previsão',
        data: predictedData.values,
        borderColor: 'rgba(156, 39, 176, 0.8)',
        backgroundColor: 'rgba(156, 39, 176, 0.2)',
        borderDash: [5, 5],
        fill: true,
        tension: 0.4
      });
    }
  }
  
  // Montar dados para gráfico
  return {
    labels: aggregatedData.labels,
    datasets: [
      {
        label: 'Vendas',
        data: aggregatedData.values,
        borderColor: '#FF8C00',
        backgroundColor: 'rgba(255, 140, 0, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: '#FF8C00',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      },
      ...predictionDataset
    ]
  };
});

// Dados para gráfico de top vendedores
const topSellersChartData = computed(() => {
  if (!reportData.value?.topSellers) return { labels: [], datasets: [] };
  
  const topSellers = reportData.value.topSellers.slice(0, 5);
  
  return {
    labels: topSellers.map(seller => seller.name || `ID: ${seller.id.slice(0, 6)}`),
    datasets: [
      {
        label: 'Vendas',
        data: topSellers.map(seller => seller.count),
        backgroundColor: ['#FF8C00', '#FFA333', '#FFB666', '#FFC999', '#FFDCCC'],
        borderWidth: 0
      }
    ]
  };
});

// Dados para gráfico de distribuição de métodos de pagamento
const paymentMethodsChartData = computed(() => {
  if (!reportData.value?.paymentMethodDistribution) return { labels: [], datasets: [] };
  
  const distribution = reportData.value.paymentMethodDistribution;
  const methodLabels = {
    pix: 'PIX',
    cash: 'Dinheiro',
    other: 'Outros'
  };
  
  return {
    labels: Object.keys(distribution).map(key => methodLabels[key as keyof typeof methodLabels] || key),
    datasets: [
      {
        data: Object.values(distribution),
        backgroundColor: ['#4CAF50', '#2196F3', '#FFC107'],
        borderWidth: 0
      }
    ]
  };
});

// Handler para atualização de período
const handleDateRangeUpdate = async (range: { startDate: Date; endDate: Date; cacheKey: string }) => {
  dateRange.value = range;
  await loadReportData();
};

// Função para formatar percentuais de crescimento
const formatGrowth = (value: number | undefined): string => {
  if (value === undefined) return '0%';
  
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value}%`;
};

// Variante de cor para indicadores de crescimento
const growthVariant = (value: number | undefined): string => {
  if (value === undefined || value === 0) return 'info';
  return value > 0 ? 'success' : 'danger';
};

// Carregar dados de relatório
const loadReportData = async (forceRefresh = false) => {
  if (!dateRange.value) return;
  
  isLoading.value = true;
  error.value = null;
  
  try {
    reportData.value = await fetchSalesReportWithDateRange(
      dateRange.value,
      forceRefresh
    );
  } catch (err: any) {
    console.error('[SalesReport] Erro ao carregar relatório:', err);
    error.value = err.message || 'Não foi possível carregar o relatório de vendas.';
  } finally {
    isLoading.value = false;
  }
};

// Exportar relatório em CSV
const exportReportCsv = async () => {
  if (!reportData.value) return;
  
  try {
    // Preparar dados para exportação
    const currentData = reportData.value.current;
    const salesByDay = currentData.salesByDay;
    
    const csvData = [
      ['Data', 'Vendas'],
      ...Object.entries(salesByDay).map(([date, sales]) => [date, sales.toString()])
    ];
    
    // Criar CSV e baixar
    let csvContent = "data:text/csv;charset=utf-8," + 
      csvData.map(row => row.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio-vendas-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (err) {
    console.error('[SalesReport] Erro ao exportar CSV:', err);
    error.value = 'Não foi possível exportar o relatório.';
  }
};

// Inicialização
onMounted(() => {
  // Iniciar com o mês atual como período padrão
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = today;
  const cacheKey = `report_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}`;
  
  dateRange.value = {
    startDate,
    endDate,
    cacheKey
  };
  
  loadReportData();
});
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold mb-4">Relatório de Vendas</h2>
    
    <!-- Seletor de período -->
    <DateRangeSelector @update:dateRange="handleDateRangeUpdate" />
    
    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p class="mt-2">Processando dados do relatório...</p>
    </div>
    
    <!-- Error -->
    <div v-else-if="error" class="text-center py-8 bg-red-50 rounded-lg border border-red-200 text-danger">
      <p class="font-medium">{{ error }}</p>
      <button 
        @click="loadReportData(true)" 
        class="mt-3 bg-primary text-white px-4 py-2 rounded"
      >
        Tentar novamente
      </button>
    </div>
    
    <!-- Report Content -->
    <div v-else-if="reportData" class="mt-6 space-y-6">
      <!-- Stats Cards Row -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total de Vendas" 
          :value="reportData.current.totalSales" 
          subtitle="bilhetes vendidos"
          variant="primary"
          :trend="reportData.growth.salesGrowth"
        />
        
        <StatCard 
          title="Pedidos" 
          :value="reportData.current.totalOrders" 
          subtitle="pedidos realizados"
          variant="secondary"
          :trend="reportData.growth.ordersGrowth"
        />
        
        <StatCard 
          title="Compradores" 
          :value="reportData.current.uniqueBuyers" 
          subtitle="compradores únicos"
          variant="success"
          :trend="reportData.growth.buyersGrowth"
        />
        
        <StatCard 
          title="Vendedores" 
          :value="reportData.current.uniqueSellers" 
          subtitle="vendedores ativos"
          variant="info"
          :trend="reportData.growth.sellersGrowth"
        />
      </div>
      
      <!-- Main Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Sales Trend Chart -->
        <Card title="Tendência de Vendas">
          <div class="p-4">
            <div class="flex justify-end mb-3">
              <div class="flex items-center">
                <label class="flex items-center text-sm">
                  <input 
                    type="checkbox" 
                    v-model="showPredictions" 
                    class="form-checkbox mr-2"
                  >
                  Mostrar Previsão
                </label>
                
                <button 
                  @click="exportReportCsv"
                  class="ml-4 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar CSV
                </button>
              </div>
            </div>
            
            <div class="h-64">
              <LineChart 
                :chart-data="salesTimeSeriesData" 
              />
            </div>
          </div>
        </Card>
        
        <!-- Top Sellers Chart -->
        <Card title="Top Vendedores">
          <div class="p-4">
            <div class="h-64">
              <BarChart 
                :chart-data="topSellersChartData" 
              />
            </div>
          </div>
        </Card>
      </div>
      
      <!-- Additional Charts and Information -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Payment Method Distribution -->
        <Card title="Métodos de Pagamento">
          <div class="p-4 flex justify-center">
            <div style="height: 200px; width: 200px;">
              <DoughnutChart :chart-data="paymentMethodsChartData" />
            </div>
          </div>
        </Card>
        
        <!-- Performance Metrics -->
        <Card title="Métricas de Desempenho" class="lg:col-span-2">
          <div class="p-4">
            <h3 class="font-medium text-gray-700 mb-3">Comparação com o Período Anterior</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Vendas -->
              <div class="bg-white p-3 border border-gray-200 rounded-lg">
                <div class="flex justify-between mb-2">
                  <span class="text-sm text-gray-600">Vendas</span>
                  <span 
                    :class="`text-sm font-medium ${reportData.growth.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`"
                  >
                    {{ formatGrowth(reportData.growth.salesGrowth) }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-xs text-gray-500">Atual: {{ reportData.current.totalSales }}</span>
                  <span class="text-xs text-gray-500">Anterior: {{ reportData.previous.totalSales }}</span>
                </div>
                <div class="mt-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    class="h-full rounded-full" 
                    :class="reportData.growth.salesGrowth >= 0 ? 'bg-green-500' : 'bg-red-500'"
                    :style="`width: ${Math.min(Math.max(
                      (reportData.current.totalSales / (reportData.previous.totalSales || 1)) * 50, 5), 100
                    )}%`"
                  ></div>
                </div>
              </div>
              
              <!-- Pedidos -->
              <div class="bg-white p-3 border border-gray-200 rounded-lg">
                <div class="flex justify-between mb-2">
                  <span class="text-sm text-gray-600">Pedidos</span>
                  <span 
                    :class="`text-sm font-medium ${reportData.growth.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`"
                  >
                    {{ formatGrowth(reportData.growth.ordersGrowth) }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-xs text-gray-500">Atual: {{ reportData.current.totalOrders }}</span>
                  <span class="text-xs text-gray-500">Anterior: {{ reportData.previous.totalOrders }}</span>
                </div>
                <div class="mt-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    class="h-full rounded-full" 
                    :class="reportData.growth.ordersGrowth >= 0 ? 'bg-green-500' : 'bg-red-500'"
                    :style="`width: ${Math.min(Math.max(
                      (reportData.current.totalOrders / (reportData.previous.totalOrders || 1)) * 50, 5), 100
                    )}%`"
                  ></div>
                </div>
              </div>
            </div>
            
            <!-- Top performers growth -->
            <h4 class="font-medium text-gray-700 mt-4 mb-2">Top Vendedores - Crescimento</h4>
            <ul class="space-y-2">
              <li v-for="seller in reportData.topSellers.slice(0, 3)" :key="seller.id" class="flex items-center">
                <div class="flex-grow">
                  <span class="text-sm font-medium">{{ seller.name || `ID: ${seller.id.slice(0, 6)}` }}</span>
                </div>
                <div class="flex items-center">
                  <span class="text-sm mr-2">{{ seller.count }} vendas</span>
                  <span 
                    :class="`px-2 py-0.5 text-xs rounded-full ${
                      seller.growth > 0 ? 'bg-green-100 text-green-800' : 
                      seller.growth < 0 ? 'bg-red-100 text-red-800' : 
                      'bg-gray-100 text-gray-800'
                    }`"
                  >
                    {{ formatGrowth(seller.growth) }}
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </Card>
      </div>
      
      <!-- Acesso ao Relatório Completo -->
      <Alert
        type="info"
        dismissible
        message="Optimize suas vendas analisando padrões e tendências. Os dados são atualizados diariamente."
      />
    </div>
  </div>
</template>
