<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { Chart, registerables } from 'chart.js';
import { useAffiliateCode } from '../../composables/useAffiliateCode';
import type { User } from '../../types/user';

Chart.register(...registerables);

// Props
const props = defineProps<{
  affiliateId: string;
  affiliate: User;
}>();

// Estados
const chartRef = ref<HTMLCanvasElement | null>(null);
const barChartRef = ref<HTMLCanvasElement | null>(null);
const chart = ref<Chart | null>(null);
const barChart = ref<Chart | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

// Composable para obter métricas
const { affiliateSalesMetrics } = useAffiliateCode();

// Verifica se temos dados para este afiliado
const hasMetrics = computed(() => {
  return !!affiliateSalesMetrics.value[props.affiliateId];
});

// Preparar os dados para o gráfico de linha (últimos 6 meses)
const prepareChartData = () => {
  if (!hasMetrics.value) return null;
  
  const metrics = affiliateSalesMetrics.value[props.affiliateId];
  
  // Exemplo de dados de meses anteriores (simulados)
  const monthlyData = [
    metrics.salesLastMonth,
    metrics.salesThisMonth,
  ];
  
  // Completar com zeros à esquerda para ter 6 meses
  while (monthlyData.length < 6) {
    monthlyData.unshift(0);
  }
  
  // Gerar labels para os últimos 6 meses
  const labels = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(now.getMonth() - i);
    labels.push(d.toLocaleDateString('pt-BR', { month: 'short' }));
  }
  
  return {
    labels,
    datasets: [
      {
        label: 'Vendas',
        data: monthlyData,
        borderColor: '#FF8C00',
        backgroundColor: 'rgba(255, 140, 0, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: '#FF8C00',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };
};

// Preparar dados para o gráfico de barras (comparação mês anterior vs atual)
const prepareBarChartData = () => {
  if (!hasMetrics.value) return null;
  
  const metrics = affiliateSalesMetrics.value[props.affiliateId];
  
  return {
    labels: ['Mês Anterior', 'Mês Atual'],
    datasets: [
      {
        label: 'Vendas',
        data: [metrics.salesLastMonth, metrics.salesThisMonth],
        backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(255, 140, 0, 0.7)'],
        borderColor: ['rgb(75, 192, 192)', 'rgb(255, 140, 0)'],
        borderWidth: 2,
        borderRadius: 6,
        barThickness: 40
      }
    ]
  };
};

// Inicializar o gráfico
const initChart = () => {
  if (!chartRef.value || !hasMetrics.value) return;
  
  const ctx = chartRef.value.getContext('2d');
  if (!ctx) return;
  
  if (chart.value) {
    chart.value.destroy();
  }
  
  const chartData = prepareChartData();
  if (!chartData) return;
  
  chart.value = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: {
              family: "'Inter', sans-serif",
              size: 12
            },
            boxWidth: 15,
            usePointStyle: true
          }
        },
        title: {
          display: true,
          text: 'Desempenho de Vendas nos Últimos 6 Meses',
          font: {
            family: "'Inter', sans-serif",
            size: 16,
            weight: 'bold'
          },
          color: '#374151'
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          titleColor: '#1F2937',
          bodyColor: '#1F2937',
          borderColor: 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
          padding: 10,
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          bodyFont: {
            family: "'Inter', sans-serif"
          },
          titleFont: {
            family: "'Inter', sans-serif",
            weight: 'bold'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
            lineWidth: 1
          },
          ticks: {
            font: {
              family: "'Inter', sans-serif",
              size: 11
            },
            color: '#6B7280'
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              family: "'Inter', sans-serif",
              size: 11
            },
            color: '#6B7280'
          }
        }
      }
    }
  });
};

// Inicializar o gráfico de barras
const initBarChart = () => {
  if (!barChartRef.value || !hasMetrics.value) return;
  
  const ctx = barChartRef.value.getContext('2d');
  if (!ctx) return;
  
  if (barChart.value) {
    barChart.value.destroy();
  }
  
  const chartData = prepareBarChartData();
  if (!chartData) return;
  
  barChart.value = new Chart(ctx, {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'Comparativo Mensal',
          font: {
            family: "'Inter', sans-serif",
            size: 16,
            weight: 'bold'
          },
          color: '#374151'
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          titleColor: '#1F2937',
          bodyColor: '#1F2937',
          borderColor: 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(context) {
              return `Vendas: ${context.raw}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
            lineWidth: 1
          },
          ticks: {
            font: {
              family: "'Inter', sans-serif"
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              family: "'Inter', sans-serif"
            }
          }
        }
      }
    }
  });
};

// Observar mudanças nas métricas
watch(() => affiliateSalesMetrics.value, () => {
  initChart();
  initBarChart();
}, { deep: true });

// Montar o componente
onMounted(() => {
  if (hasMetrics.value) {
    initChart();
    initBarChart();
  }
});
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center items-center p-4">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
    
    <div v-else-if="error" class="text-danger text-center p-4">
      {{ error }}
    </div>
    
    <div v-else-if="hasMetrics" class="space-y-6">
      <h3 class="text-lg font-medium text-gray-900">Análise de Desempenho: {{ props.affiliate.displayName }}</h3>
      
      <!-- Resumo de métricas -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-gradient-to-br from-primary-light to-primary bg-opacity-90 text-white p-4 rounded-lg shadow-md flex flex-col">
          <p class="text-xs uppercase tracking-wider text-white text-opacity-80">Total de Vendas</p>
          <p class="text-3xl font-bold mt-1">{{ affiliateSalesMetrics[props.affiliateId].totalSales }}</p>
          <div class="mt-auto pt-2 text-xs">
            <span class="text-white text-opacity-80">Todos os períodos</span>
          </div>
        </div>
        
        <div class="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow-md flex flex-col">
          <p class="text-xs uppercase tracking-wider text-white text-opacity-80">Valor Total</p>
          <p class="text-3xl font-bold mt-1">R$ {{ affiliateSalesMetrics[props.affiliateId].totalValue }}</p>
          <div class="mt-auto pt-2 text-xs">
            <span class="text-white text-opacity-80">Em reais</span>
          </div>
        </div>
        
        <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-4 rounded-lg shadow-md flex flex-col"
             :class="affiliateSalesMetrics[props.affiliateId].growthRate < 0 ? 'from-red-500 to-red-600' : 'from-emerald-500 to-emerald-600'">
          <p class="text-xs uppercase tracking-wider text-white text-opacity-80">Crescimento</p>
          <p class="text-3xl font-bold mt-1 flex items-center">
            <span v-if="affiliateSalesMetrics[props.affiliateId].growthRate >= 0" class="mr-1">+</span>
            {{ affiliateSalesMetrics[props.affiliateId].growthRate }}%
            
            <svg v-if="affiliateSalesMetrics[props.affiliateId].growthRate >= 0" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
            </svg>
          </p>
          <div class="mt-auto pt-2 text-xs">
            <span class="text-white text-opacity-80">Comparado ao mês anterior</span>
          </div>
        </div>
      </div>
      
      <!-- Gráficos -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
          <canvas ref="chartRef"></canvas>
        </div>
        
        <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200">
          <canvas ref="barChartRef"></canvas>
        </div>
      </div>
      
      <!-- Detalhes adicionais -->
      <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h4 class="font-medium text-gray-700 mb-3">Análise Detalhada</h4>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex items-start">
            <div class="bg-blue-100 p-2 rounded-full mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h5 class="font-medium text-gray-800">Este Mês</h5>
              <p class="text-gray-600">{{ affiliateSalesMetrics[props.affiliateId].salesThisMonth }} vendas registradas</p>
            </div>
          </div>
          
          <div class="flex items-start">
            <div class="bg-purple-100 p-2 rounded-full mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h5 class="font-medium text-gray-800">Última Atividade</h5>
              <p class="text-gray-600">
                {{ affiliateSalesMetrics[props.affiliateId].lastSaleDate 
                   ? (function() {
                       try {
                         const lastSaleDate = affiliateSalesMetrics[props.affiliateId].lastSaleDate;
                         if (lastSaleDate === null || lastSaleDate === undefined) {
                           return 'Data inválida';
                         }
                         const date = new Date(lastSaleDate as string | number | Date);
                         return isNaN(date.getTime()) ? 'Data inválida' : date.toLocaleDateString('pt-BR', { 
                           day: 'numeric', 
                           month: 'long', 
                           year: 'numeric'
                         });
                       } catch(e) {
                         return 'Data inválida';
                       }
                     })()
                   : 'Nenhuma venda registrada' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p class="text-gray-600 text-lg font-medium">Sem dados disponíveis</p>
      <p class="text-gray-500 mt-1">Não há métricas de desempenho disponíveis para este afiliado.</p>
    </div>
  </div>
</template>
