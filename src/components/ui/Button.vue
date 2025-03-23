<script setup lang="ts">
import { computed } from 'vue';

// Definir tipos específicos para as variantes e tamanhos
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';
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
    validator: (value: string) => ['primary', 'secondary', 'danger', 'outline', 'ghost'].includes(value)
  },
  size: {
    type: String as () => ButtonSize,
    default: 'md',
    validator: (value: string) => ['sm', 'md', 'lg'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  block: {
    type: Boolean,
    default: false
  }
});

// Definindo classes para cada variante, com classes CSS diretas
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white btn-primary',
  secondary: 'bg-secondary text-gray-900 btn-secondary',
  danger: 'bg-danger hover:bg-red-600 text-white',
  outline: 'bg-transparent border border-primary text-primary hover:bg-primary hover:text-white',
  ghost: 'bg-transparent text-primary hover:bg-gray-100'
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'py-1 px-3 text-sm',
  md: 'py-2 px-4',
  lg: 'py-3 px-6 text-lg'
};

// Garantir acesso seguro às classes usando o tipo correto
const computedClasses = computed(() => [
  'rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
  variantClasses[props.variant as ButtonVariant],
  sizeClasses[props.size as ButtonSize],
  props.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
  props.block ? 'w-full' : ''
]);
</script>

<template>
  <button :type="type" :disabled="disabled" :class="computedClasses">
    <slot></slot>
  </button>
</template>