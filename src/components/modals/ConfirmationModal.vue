<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { PaymentMethod, type Order } from '../../types/order';
import Modal from '../ui/Modal.vue';

const props = defineProps<{
  show: boolean;
  order?: Order;
}>();

const emit = defineEmits<{
  close: [];
}>();

const router = useRouter();

// Calcular o valor total (R$1 por número)
const totalValue = computed(() => {
  if (!props.order?.generatedNumbers) return 0;
  return props.order.generatedNumbers.length;
});

// Fechar o modal e redirecionar para a página de vendas
const goToSales = () => {
  emit('close');
  router.push({ name: 'perfil-vendas' });
};

// Apenas fechar o modal sem redirecionar
const handleClose = () => {
  emit('close');
};
</script>

<template>
  <Modal 
    :show="show" 
    title="Pedido Realizado com Sucesso!"
    :closeOnClickOutside="false"
    :persistent="true" 
    :forceShowCloseButton="true"
    @close="handleClose"
    scrollable
    :customClass="'confirmation-modal'"
  >
    <div v-if="order" class="space-y-4">
      <!-- Cada informação tem seu próprio container -->
      <div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <h4 class="text-sm text-gray-500 mb-1">Vendedor</h4>
        <p class="font-medium">{{ order.sellerName }}</p>
      </div>
      
      <div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <h4 class="text-sm text-gray-500 mb-1">Comprador</h4>
        <p class="font-medium truncate" :title="order.buyerName">{{ order.buyerName }}</p>
      </div>
      
      <div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <h4 class="text-sm text-gray-500 mb-1">Forma de pagamento</h4>
        <p class="font-medium">{{ order.paymentMethod === PaymentMethod.PIX ? 'Pix' : 'Dinheiro' }}</p>
      </div>
      
      <div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <h4 class="text-sm text-gray-500 mb-1">Contato</h4>
        <p class="font-medium truncate" :title="order.contactNumber">{{ order.contactNumber }}</p>
      </div>
      
      <div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <h4 class="text-sm text-gray-500 mb-1">Local</h4>
        <p class="font-medium truncate" :title="order.addressOrCongregation">{{ order.addressOrCongregation }}</p>
      </div>
      
      <div v-if="order.observations" class="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <h4 class="text-sm text-gray-500 mb-1">Observações</h4>
        <p class="font-medium truncate" :title="order.observations">{{ order.observations }}</p>
      </div>
      
      <div class="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <h4 class="text-sm text-blue-700 mb-1 font-medium">Números Gerados</h4>
        <div class="flex flex-wrap justify-center gap-2 mt-2">
          <span 
            v-for="number in order.generatedNumbers" 
            :key="number" 
            class="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium"
          >
            {{ number }}
          </span>
        </div>
      </div>
    </div>
    
    <template #footer>
      <div class="flex items-center justify-between w-full">
        <div class="text-green-700 font-medium">
          Valor Total: <span class="text-lg font-bold">R$ {{ totalValue }},00</span>
        </div>
        <button 
          @click="goToSales"
          class="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center"
        >
          <span>Minhas Vendas</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
/* Os estilos agora estão centralizados no componente Modal */
</style>
