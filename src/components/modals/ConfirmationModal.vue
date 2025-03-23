<script setup lang="ts">
import type { Order } from '../../types/order';

defineProps<{
  show: boolean;
  order?: Order;
}>();

const emit = defineEmits<{
  close: [];
}>();

const close = () => {
  emit('close');
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 flex items-center justify-center z-50">
    <div class="fixed inset-0 bg-black opacity-50" @click="close"></div>
    
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 z-10 relative">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Confirmação de Pedido</h2>
        <button @click="close" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div v-if="order" class="space-y-3">
        <p><span class="font-semibold">Vendedor:</span> {{ order.sellerName }}</p>
        <p><span class="font-semibold">Comprador:</span> {{ order.buyerName }}</p>
        <p><span class="font-semibold">Forma de pagamento:</span> {{ order.paymentMethod === 'pix' ? 'Pix' : 'Dinheiro' }}</p>
        <p><span class="font-semibold">Contato:</span> {{ order.contactNumber }}</p>
        <p><span class="font-semibold">Local:</span> {{ order.addressOrCongregation }}</p>
        
        <p v-if="order.observations">
          <span class="font-semibold">Observações:</span> {{ order.observations }}
        </p>
        
        <div>
          <p class="font-semibold">Números gerados:</p>
          <div class="flex flex-wrap gap-2 mt-2">
            <span 
              v-for="number in order.generatedNumbers" 
              :key="number" 
              class="bg-primary text-white px-3 py-1 rounded-full text-sm"
            >
              {{ number }}
            </span>
          </div>
        </div>
      </div>
      
      <div class="mt-6 flex justify-center">
        <button 
          @click="close"
          class="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  </div>
</template>
