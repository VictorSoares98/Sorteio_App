<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  noPadding: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value: string) => ['default', 'primary', 'secondary', 'outline'].includes(value)
  },
  shadow: {
    type: String,
    default: 'md',
    validator: (value: string) => ['sm', 'md', 'lg', 'none'].includes(value)
  },
  rounded: {
    type: String,
    default: 'md',
    validator: (value: string) => ['sm', 'md', 'lg', 'none', 'full'].includes(value)
  }
});

// Computar classes com base nas props
const cardClasses = computed(() => {
  const classes = ['bg-white overflow-hidden'];
  
  // Adicionar classes de arredondamento
  switch (props.rounded) {
    case 'sm': classes.push('rounded-sm'); break;
    case 'md': classes.push('rounded-lg'); break; 
    case 'lg': classes.push('rounded-xl'); break;
    case 'full': classes.push('rounded-full'); break;
    case 'none': break; // Sem arredondamento
    default: classes.push('rounded-lg');
  }
  
  // Adicionar classes de sombra
  switch (props.shadow) {
    case 'sm': classes.push('shadow'); break;
    case 'md': classes.push('shadow-md'); break;
    case 'lg': classes.push('shadow-lg'); break;
    case 'none': break; // Sem sombra
    default: classes.push('shadow-md');
  }
  
  // Variantes de estilo
  switch (props.variant) {
    case 'primary': 
      classes.push('border-2 border-primary'); 
      break;
    case 'secondary': 
      classes.push('border-2 border-secondary'); 
      break;
    case 'outline': 
      classes.push('border border-gray-200'); 
      break;
    default: // Padrão sem borda específica
      break;
  }
  
  return classes.join(' ');
});
</script>

<template>
  <div :class="cardClasses">
    <!-- Card Header (se tiver título) -->
    <div v-if="title" class="border-b px-6 py-4">
      <h3 class="text-lg font-medium text-primary">{{ title }}</h3>
      <p v-if="subtitle" class="mt-1 text-sm text-gray-600">{{ subtitle }}</p>
      
      <!-- Slot para conteúdo adicional no cabeçalho -->
      <slot name="header"></slot>
    </div>
    
    <!-- Card Body -->
    <div :class="{ 'p-6': !noPadding }">
      <slot></slot>
    </div>
    
    <!-- Card Footer (se tiver slot de footer) -->
    <div v-if="$slots.footer" class="bg-gray-50 px-6 py-3 border-t">
      <slot name="footer"></slot>
    </div>
  </div>
</template>
