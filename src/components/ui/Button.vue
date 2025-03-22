<script setup lang="ts">
const props = defineProps({
  type: {
    type: String,
    default: 'button',
    validator: (value: string) => ['button', 'submit', 'reset'].includes(value)
  },
  variant: {
    type: String,
    default: 'primary',
    validator: (value: string) => ['primary', 'secondary', 'danger', 'outline', 'ghost'].includes(value)
  },
  size: {
    type: String,
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

const variantClasses = {
  primary: 'bg-primary hover:bg-blue-700 text-white',
  secondary: 'bg-secondary hover:bg-yellow-400 text-gray-900',
  danger: 'bg-danger hover:bg-red-600 text-white',
  outline: 'bg-transparent border border-primary text-primary hover:bg-primary hover:text-white',
  ghost: 'bg-transparent text-primary hover:bg-gray-100'
};

const sizeClasses = {
  sm: 'py-1 px-3 text-sm',
  md: 'py-2 px-4',
  lg: 'py-3 px-6 text-lg'
};

const computedClasses = [
  'rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
  variantClasses[props.variant],
  sizeClasses[props.size],
  props.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
  props.block ? 'w-full' : ''
];
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="computedClasses"
  >
    <slot></slot>
  </button>
</template>
