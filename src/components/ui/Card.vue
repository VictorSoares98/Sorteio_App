<script setup lang="ts">
defineProps({
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
  }
});
</script>

<template>
  <div class="bg-white rounded-lg shadow-md overflow-hidden">
    <!-- Card Header (se tiver título) -->
    <div v-if="title" class="border-b px-6 py-4">
      <h3 class="text-lg font-medium text-primary">{{ title }}</h3>
      <p v-if="subtitle" class="mt-1 text-sm text-gray-600">{{ subtitle }}</p>
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
