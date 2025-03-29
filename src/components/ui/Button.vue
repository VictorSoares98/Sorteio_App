<script setup lang="ts">
type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'outline';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const props = defineProps({
  variant: {
    type: String as () => ButtonVariant,
    default: 'primary',
    validator: (value: string) => 
      ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'outline'].includes(value)
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
  href: {
    type: String,
    default: ''
  },
  ariaLabel: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['click']);

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event);
  }
};
</script>

<template>
  <button
    :type="props.href ? undefined : 'button'"
    :disabled="disabled || loading"
    @click="handleClick"
    class="btn"
    :class="[
      `btn-${variant}`,
      `btn-${size}`,
      { 'w-full': block }
    ]"
    :aria-label="ariaLabel"
  >
    <slot></slot>
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