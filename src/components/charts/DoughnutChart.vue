<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { ChartData } from 'chart.js';

// Registrar componentes necessários do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

const props = defineProps({
  chartData: {
    type: Object as () => ChartData<'doughnut', number[]>,
    required: true
  },
  chartId: {
    type: String,
    default: 'doughnut-chart'
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
    default: () => ({})
  }
});

// Configurações padrão com cores da UMADRIMC
const defaultOptions = computed(() => {
  // Detecção melhorada de tamanhos de tela
  const screenWidth = window.innerWidth;
  const isMobile = screenWidth < 640;
  const isTablet = screenWidth >= 640 && screenWidth < 1024;
  
  return {
    responsive: true, 
    maintainAspectRatio: true,
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
      }
    },
    ...props.options
  };
});

// Adicionar listener para atualização em resize de tela
onMounted(() => {
  window.addEventListener('resize', () => {
    // Forçar reatualização das opções
    const chart = ChartJS.getChart(props.chartId);
    if (chart) {
      chart.options = defaultOptions.value;
      chart.update();
    }
  });
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
  <Doughnut
    :chart-data="chartData"
    :chart-id="chartId"
    :width="width"
    :height="height"
    :css-classes="cssClasses"
    :options="defaultOptions"
  />
</template>
