<script setup lang="ts">
import { computed } from 'vue';
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

// Configurações padrão do estilo da marca do UMADRIMC
const defaultOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
    }
  },
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: false
    }
  },
  ...props.options
}));
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
