<script setup lang="ts">
import { PaymentMethod, type Order } from '../../types/order';
import Modal from '../ui/Modal.vue';

defineProps<{
  show: boolean;
  order?: Order;
}>();

const emit = defineEmits<{
  close: [];
}>();

const handleClose = () => {
  emit('close');
};
</script>

<template>
  <Modal 
    :show="show" 
    title="Confirmação de Pedido"
    :closeOnClickOutside="true"
    @close="handleClose"
  >
    <div v-if="order" class="space-y-3">
      <p><span class="font-semibold">Vendedor:</span> {{ order.sellerName }}</p>
      <p><span class="font-semibold">Comprador:</span> {{ order.buyerName }}</p>
      <p><span class="font-semibold">Forma de pagamento:</span> {{ order.paymentMethod === PaymentMethod.PIX ? 'Pix' : 'Dinheiro' }}</p>
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
    
    <template #footer>
      <button 
        @click="handleClose"
        class="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded transition-colors"
      >
        Fechar
      </button>
    </template>
  </Modal>
</template>
