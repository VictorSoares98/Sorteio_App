<script setup lang="ts">
import { computed } from 'vue';

// Definir tipos específicos para as variantes e tamanhos
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'success' | 'warning' | 'info';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type ButtonType = 'button' | 'submit' | 'reset';

const props = defineProps({
  type: {
    type: String as () => ButtonType,
    default: 'button',
    validator: (value: string) => ['button', 'submit', 'reset'].includes(value)
  },
  variant: {
    type: String as () => ButtonVariant,
    default: 'primary',
    validator: (value: string) => ['primary', 'secondary', 'danger', 'outline', 'ghost', 'success', 'warning', 'info'].includes(value)
  },
  size: {
    type: String as () => ButtonSize,
    default: 'md',
    validator: (value: string) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  block: {
    type: Boolean,
    default: false
  },
  rounded: {
    type: String,
    default: 'md',
    validator: (value: string) => ['none', 'sm', 'md', 'lg', 'full'].includes(value)
  },
  href: {
    type: String,
    default: ''
  },
  target: {
    type: String,
    default: '_self'
  },
  iconLeft: {
    type: String,
    default: ''
  },
  iconRight: {
    type: String,
    default: ''
  },
  noPadding: {
    type: Boolean,
    default: false
  },
  ariaLabel: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['click']);

// Definindo classes para cada variante, com classes CSS diretas
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-dark focus:ring-primary/30',
  secondary: 'bg-secondary text-gray-900 hover:bg-secondary-dark active:bg-secondary-dark focus:ring-secondary/30',
  danger: 'bg-danger text-white hover:bg-red-600 active:bg-red-700 focus:ring-red-500/30',
  success: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700 focus:ring-green-500/30',
  warning: 'bg-yellow-500 text-white hover:bg-yellow-600 active:bg-yellow-700 focus:ring-yellow-500/30',
  info: 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 focus:ring-blue-500/30',
  outline: 'bg-transparent border border-primary text-primary hover:bg-primary hover:text-white active:bg-primary-dark focus:ring-primary/20',
  ghost: 'bg-transparent text-primary hover:bg-gray-100 active:bg-gray-200 focus:ring-primary/20'
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'text-xs py-1 px-2',
  sm: 'text-sm py-1 px-3',
  md: 'text-base py-2 px-4',
  lg: 'text-lg py-2.5 px-5',
  xl: 'text-xl py-3 px-6'
};

const roundedClasses: Record<string, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded',
  lg: 'rounded-lg',
  full: 'rounded-full'
};

// Determinar se devemos renderizar um botão ou um link
const isLink = computed(() => !!props.href);

// Computar classes dinâmicas
const computedClasses = computed(() => {
  const classes = [
    'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 select-none',
    variantClasses[props.variant as ButtonVariant],
    roundedClasses[props.rounded],
    props.disabled || props.loading ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
    props.block ? 'w-full' : '',
    !props.noPadding ? sizeClasses[props.size as ButtonSize] : ''
  ];
  
  return classes.join(' ');
});

// Manipulador de clique para emitir eventos quando não estiver desabilitado ou carregando
const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event);
  }
};
</script>

<template>
  <a v-if="isLink" :href="href" :target="target" :class="computedClasses" :aria-label="ariaLabel" @click="handleClick">
    <slot />
  </a>
  <button v-else :type="type" :class="computedClasses" :disabled="disabled || loading" :aria-label="ariaLabel" @click="handleClick">
    <slot />
  </button>
</template>

<style scoped>
/* Animação de loading otimizada */
@keyframes button-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: button-spin 1s linear infinite;
}
</style>