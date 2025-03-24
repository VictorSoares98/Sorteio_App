<script setup lang="ts">
/**
 * Componente para exibir números do sorteio de forma padronizada
 * Garante formatação consistente com 5 dígitos
 */

import { computed } from 'vue'; // Importação necessária do 'computed'
import { formatRaffleNumber } from '../../utils/formatters';

const props = defineProps<{
  value: string | number;
  variant?: 'badge' | 'simple' | 'large' | 'small';
  color?: 'primary' | 'secondary' | 'gray';
}>();

// Formatar o número para garantir 5 dígitos
const formattedNumber = formatRaffleNumber(props.value.toString());

// Definir classes CSS baseado na variante
const classes = {
  badge: 'bg-primary text-white px-3 py-1 rounded-full text-sm',
  simple: 'font-mono',
  large: 'font-mono text-lg font-bold',
  small: 'font-mono text-xs',
};

// Cores alternativas
const colorClasses = {
  primary: 'bg-primary text-white',
  secondary: 'bg-secondary text-gray-800',
  gray: 'bg-gray-200 text-gray-800',
};

const displayClass = computed(() => {
  const baseClass = classes[props.variant || 'simple'];
  
  // Adicionar classe de cor apenas para badge
  if (props.variant === 'badge' && props.color) {
    return `${baseClass.replace('bg-primary', '')} ${colorClasses[props.color]}`;
  }
  
  return baseClass;
});
</script>

<template>
  <span :class="displayClass">{{ formattedNumber }}</span>
</template>
