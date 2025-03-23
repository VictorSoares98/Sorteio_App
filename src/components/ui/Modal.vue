<script setup lang="ts">
/**
 * Componente Modal base reutilizável
 * Fornece estrutura, overlay e funcionalidades básicas de um modal
 */
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  closeOnClickOutside: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['close', 'confirm']);

const closeModal = () => {
  emit('close');
};

const confirmModal = () => {
  emit('confirm');
};

const handleClickOutside = () => {
  if (props.closeOnClickOutside) {
    closeModal();
  }
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 flex items-center justify-center z-50">
    <!-- Overlay -->
    <div 
      class="fixed inset-0 bg-black opacity-50" 
      @click="handleClickOutside"
    ></div>
    
    <!-- Modal Container -->
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 z-10 relative">
      <!-- Header -->
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">{{ title }}</h2>
        <button @click="closeModal" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- Content -->
      <div class="mb-6">
        <slot></slot>
      </div>
      
      <!-- Footer -->
      <div class="flex justify-end gap-2">
        <slot name="footer">
          <button 
            @click="closeModal"
            class="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
          >
            Cancelar
          </button>
          <button 
            @click="confirmModal"
            class="btn-primary py-2 px-4 rounded"
          >
            Confirmar
          </button>
        </slot>
      </div>
    </div>
  </div>
</template>
