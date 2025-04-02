<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, 
         Title, Tooltip, Legend } from 'chart.js';
import type { ChartData } from 'chart.js';

// Registrar componentes necessários do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title, 
  Tooltip, 
  Legend
);

const props = defineProps({
  chartData: {
    type: Object as () => ChartData<'bar', number[]>,
    required: true
  },
  chartId: {
    type: String,
    default: 'bar-chart'
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
const defaultOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true
    }
  },
  plugins: {
    legend: {
      position: 'top',
    }
  },
  ...props.options
}));
</script>

<template>
  <Bar
    :chart-data="chartData"
    :chart-id="chartId"
    :width="width"
    :height="height"
    :css-classes="cssClasses"
    :options="defaultOptions"
  />
</template>
