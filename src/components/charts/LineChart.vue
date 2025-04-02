<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
         LineElement, Title, Tooltip, Legend } from 'chart.js';
import type { ChartData } from 'chart.js';

// Registrar componentes necessários do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const props = defineProps({
  chartData: {
    type: Object as () => ChartData<'line'>,
    required: true
  },
  chartId: {
    type: String,
    default: 'line-chart'
  },
  width: {
    type: Number,
    default: 400
  },
  height: {
    type: Number,
    default: 200
  },
  cssClasses: {
    type: String,
    default: ''
  },
  options: {
    type: Object,
    default: () => ({
      responsive: true,
      maintainAspectRatio: false
    })
  }
});

// Configurações padrão do estilo da marca do UMADRIMC com responsividade
const defaultOptions = computed(() => {
  // Detecção melhorada de tamanhos de tela
  const screenWidth = window.innerWidth;
  const isMobile = screenWidth < 640;
  const isTablet = screenWidth >= 640 && screenWidth < 1024;
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: isMobile ? 10 : isTablet ? 11 : 12
          }
        }
      },
      x: {
        ticks: {
          font: {
            size: isMobile ? 10 : isTablet ? 11 : 12
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: isMobile ? 8 : isTablet ? 10 : 12,
          font: {
            size: isMobile ? 10 : isTablet ? 11 : 12
          },
          padding: isMobile ? 5 : isTablet ? 8 : 10
        }
      },
      title: {
        display: false
      }
    },
    ...props.options
  };
});

// Referência para o handler para poder removê-lo corretamente
const handleResize = () => {
  const chart = ChartJS.getChart(props.chartId);
  if (chart) {
    chart.options = defaultOptions.value;
    chart.update();
  }
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <Line
    :chart-data="chartData"
    :chart-id="chartId"
    :width="width"
    :height="height"
    :css-classes="cssClasses"
    :options="defaultOptions"
  />
</template>
