<script setup lang="ts">
import { ref } from 'vue';
import { PaymentMethod, OrderFormData } from '../../types/order';
import { useRaffleNumbers } from '../../composables/useRaffleNumbers';
import { validateName, validatePhone } from '../../utils/validation';
import { useAuthStore } from '../../stores/authStore';
import { formatPhone } from '../../utils/formatting';
// Remover importações desnecessárias já que estamos usando orderStore
// import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
// import { db } from '../../firebase';
import Input from '../ui/Input.vue';
import Button from '../ui/Button.vue';
import ConfirmationModal from '../modals/ConfirmationModal.vue';
import { useOrderStore } from '../../stores/orderStore';

// Form data com validação
const formData = ref<OrderFormData>({
  buyerName: '',
  paymentMethod: PaymentMethod.PIX,
  contactNumber: '',
  addressOrCongregation: '',
  observations: ''
});

// Estados do formulário
const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);
const showConfirmation = ref(false);
const orderId = ref<string | null>(null);

// Composables
const { generatedNumbers, isGenerating, error: raffleError, generateUniqueNumbers } = useRaffleNumbers();
const authStore = useAuthStore();
const orderStore = useOrderStore();

// Referência ao pedido criado para o modal de confirmação
const createdOrder = ref<any>(null);

// Faz validação dos campos antes de submit
const validateForm = () => {
  errors.value = {};
  
  if (!validateName(formData.value.buyerName)) {
    errors.value.buyerName = 'Nome deve ter pelo menos 3 caracteres';
  }
  
  if (!validatePhone(formData.value.contactNumber)) {
    errors.value.contactNumber = 'Formato inválido. Use: (00) 00000-0000';
  }
  
  if (!formData.value.addressOrCongregation) {
    errors.value.addressOrCongregation = 'Este campo é obrigatório';
  }
  
  return Object.keys(errors.value).length === 0;
};

// Formata o telefone durante a digitação
const formatContactNumber = (event: Event) => {
  const input = event.target as HTMLInputElement;
  formData.value.contactNumber = formatPhone(input.value);
};

// Processa o envio do formulário
const submitForm = async () => {
  if (!validateForm()) return;
  
  try {
    isSubmitting.value = true;
    
    // 1. Gerar números únicos para o sorteio
    await generateUniqueNumbers();
    
    if (raffleError.value) {
      throw new Error(raffleError.value);
    }
    
    // 2. Certificar que o usuário está logado
    if (!authStore.currentUser) {
      throw new Error('Você precisa estar logado para criar um pedido');
    }
    
    // 3. Criar pedido usando a orderStore para melhor organização do código
    const newOrderId = await orderStore.createOrder(formData.value, generatedNumbers.value);
    
    // 4. Buscar o pedido criado para o modal
    createdOrder.value = orderStore.orders.find(order => order.id === newOrderId);
    
    if (!createdOrder.value) {
      console.warn('Pedido criado não encontrado na lista, buscando dados do ID');
      // Tentar uma abordagem alternativa - em um sistema real, poderíamos buscar o pedido da API
      createdOrder.value = {
        id: newOrderId,
        buyerName: formData.value.buyerName,
        paymentMethod: formData.value.paymentMethod,
        contactNumber: formData.value.contactNumber,
        addressOrCongregation: formData.value.addressOrCongregation,
        observations: formData.value.observations,
        generatedNumbers: generatedNumbers.value,
        sellerId: authStore.currentUser.id,
        sellerName: authStore.currentUser.displayName,
        createdAt: new Date()
      };
    }
    
    // 5. Mostrar confirmação e resetar formulário
    orderId.value = newOrderId;
    showConfirmation.value = true;
    resetForm();
    
  } catch (err: any) {
    console.error('Erro ao criar pedido:', err);
    errors.value.submit = err.message || 'Erro ao processar pedido. Tente novamente.';
  } finally {
    isSubmitting.value = false;
  }
};

// Reseta o formulário após envio bem-sucedido
const resetForm = () => {
  formData.value = {
    buyerName: '',
    paymentMethod: PaymentMethod.PIX,
    contactNumber: '',
    addressOrCongregation: '',
    observations: ''
  };
};

// Fecha o modal de confirmação
const closeConfirmation = () => {
  showConfirmation.value = false;
};
</script>

<template>
  <form @submit.prevent="submitForm" class="form-container">
    <!-- Form Title -->
    <h2 class="form-title">Novo Pedido</h2>
    
    <!-- Buyer Name -->
    <Input
      id="buyerName"
      v-model="formData.buyerName"
      label="Nome do Comprador"
      required
      :error="errors.buyerName || ''"
    />
    
    <!-- Payment Method -->
    <div class="mb-4">
      <label class="form-label">
        Forma de Pagamento <span class="text-danger">*</span>
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
    
    <!-- Contact Number -->
    <Input
      id="contactNumber"
      v-model="formData.contactNumber"
      label="Número de Contato"
      type="tel"
      required
      placeholder="(00) 00000-0000"
      :error="errors.contactNumber || ''"
      @input="formatContactNumber"
    />
    
    <!-- Address or Congregation -->
    <Input
      id="addressOrCongregation"
      v-model="formData.addressOrCongregation"
      label="Endereço ou Congregação"
      required
      :error="errors.addressOrCongregation || ''"
    />
    
    <!-- Observations -->
    <div class="mb-6">
      <label class="form-label" for="observations">
        Observações (opcional)
      </label>
      <textarea
        id="observations"
        v-model="formData.observations"
        class="form-input"
        rows="3"
      ></textarea>
    </div>
    
    <!-- Submit Error -->
    <div v-if="errors.submit" class="form-error-container">
      {{ errors.submit }}
    </div>
    
    <!-- Submit Button -->
    <div class="flex items-center justify-center">
      <Button
        type="submit"
        :disabled="isSubmitting || isGenerating"
        variant="primary"
        block
      >
        <span v-if="isSubmitting || isGenerating">Processando...</span>
        <span v-else>Finalizar Pedido</span>
      </Button>
    </div>
  </form>
  
  <!-- Confirmation Modal -->
  <ConfirmationModal
    :show="showConfirmation"
    :order="createdOrder"
    @close="closeConfirmation"
  />
</template>