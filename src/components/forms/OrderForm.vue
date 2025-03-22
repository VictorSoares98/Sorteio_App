<script setup lang="ts">
import { ref } from 'vue';
import { PaymentMethod, OrderFormData } from '../../types/order';

const formData = ref<OrderFormData>({
  buyerName: '',
  paymentMethod: PaymentMethod.PIX,
  contactNumber: '',
  addressOrCongregation: '',
  observations: ''
});

const submitForm = () => {
  // A implementação completa será feita quando criarmos o orderStore e os serviços
  console.log('Dados do formulário:', formData.value);
  // Lógica para gerar números e exibir modal será implementada após
};
</script>

<template>
  <form @submit.prevent="submitForm" class="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md">
    <div class="mb-4">
      <label class="block text-gray-700 text-sm font-bold mb-2" for="buyerName">
        Nome do Comprador
      </label>
      <input
        id="buyerName"
        v-model="formData.buyerName"
        type="text"
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
      />
    </div>
    
    <div class="mb-4">
      <label class="block text-gray-700 text-sm font-bold mb-2">
        Forma de Pagamento
      </label>
      <div class="flex space-x-4">
        <label class="inline-flex items-center">
          <input 
            type="radio" 
            v-model="formData.paymentMethod" 
            :value="PaymentMethod.PIX" 
            class="form-radio text-primary"
          />
          <span class="ml-2">Pix</span>
        </label>
        <label class="inline-flex items-center">
          <input 
            type="radio" 
            v-model="formData.paymentMethod" 
            :value="PaymentMethod.DINHEIRO" 
            class="form-radio text-primary"
          />
          <span class="ml-2">Dinheiro</span>
        </label>
      </div>
    </div>
    
    <div class="mb-4">
      <label class="block text-gray-700 text-sm font-bold mb-2" for="contactNumber">
        Número de Contato
      </label>
      <input
        id="contactNumber"
        v-model="formData.contactNumber"
        type="tel"
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
        placeholder="(00) 00000-0000"
      />
    </div>
    
    <div class="mb-4">
      <label class="block text-gray-700 text-sm font-bold mb-2" for="addressOrCongregation">
        Endereço ou Congregação
      </label>
      <input
        id="addressOrCongregation"
        v-model="formData.addressOrCongregation"
        type="text"
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
      />
    </div>
    
    <div class="mb-6">
      <label class="block text-gray-700 text-sm font-bold mb-2" for="observations">
        Observações (opcional)
      </label>
      <textarea
        id="observations"
        v-model="formData.observations"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
        rows="3"
      ></textarea>
    </div>
    
    <div class="flex items-center justify-center">
      <button
        type="submit"
        class="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline"
      >
        Finalizar Pedido
      </button>
    </div>
  </form>
</template>
