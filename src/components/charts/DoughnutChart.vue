<script setup lang="ts">
import { computed } from 'vue';
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
const defaultOptions = computed(() => ({
  responsive: true, 
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        boxWidth: 12
      }
    }
  },
  ...props.options
}));
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
