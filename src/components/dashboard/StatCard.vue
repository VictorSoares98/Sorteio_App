<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  trend: {
    type: Number, // Valor que indica tendência (positivo, negativo ou neutro)
    default: null
  },
  variant: {
    type: String,
    default: 'primary',
    validator: (val: string) => ['primary', 'secondary', 'success', 'info', 'warning', 'danger'].includes(val)
  },
  loading: {
    type: Boolean,
    default: false
  }
});

// Determinar classe de cor baseada na variante
const cardClass = computed(() => {
  switch (props.variant) {
    case 'primary': return 'bg-primary text-white';
    case 'secondary': return 'bg-secondary text-gray-800';
    case 'success': return 'bg-green-500 text-white';
    case 'info': return 'bg-blue-500 text-white';
    case 'warning': return 'bg-yellow-500 text-gray-800';
    case 'danger': return 'bg-red-500 text-white';
    default: return 'bg-primary text-white';
  }
});

// Determinar classe de ícone de tendência
const trendClass = computed(() => {
  if (props.trend === null) return '';
  return props.trend > 0 
    ? 'text-green-500' 
    : props.trend < 0 
      ? 'text-red-500' 
      : 'text-gray-500';
});

// Formatar a tendência como percentual
const trendFormatted = computed(() => {
  if (props.trend === null) return '';
  const sign = props.trend > 0 ? '+' : '';
  return `${sign}${props.trend}%`;
});
</script>

<template>
  <div class="rounded-lg shadow-md overflow-hidden">
    <div class="p-4" :class="cardClass">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="text-sm font-medium opacity-75">{{ title }}</h3>
          
          <div v-if="loading" class="mt-2 flex items-center">
            <div class="animate-pulse w-16 h-8 bg-white bg-opacity-20 rounded"></div>
          </div>
          <div v-else class="mt-1">
            <div class="text-2xl font-bold">{{ value }}</div>
            <div v-if="subtitle" class="text-xs mt-1 opacity-75">{{ subtitle }}</div>
          </div>
        </div>
        
        <div v-if="icon" class="text-2xl opacity-75">
          <i :class="icon"></i>
        </div>
      </div>
      
      <!-- Indicador de tendência -->
      <div v-if="trend !== null && !loading" class="mt-2 text-xs">
        <span :class="trendClass" class="font-medium flex items-center">
          <svg v-if="trend > 0" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
          </svg>
          <svg v-else-if="trend < 0" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
          {{ trendFormatted }} desde o mês passado
        </span>
      </div>
    </div>
  </div>
</template>
