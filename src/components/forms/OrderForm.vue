<script setup lang="ts">
import { ref } from 'vue';
import { PaymentMethod, type OrderFormData } from '../../types/order';
import { useRaffleNumbers } from '../../composables/useRaffleNumbers';
import { validateName, validatePhone } from '../../utils/validation';
import { useAuthStore } from '../../stores/authStore';
import { formatPhone } from '../../utils/formatting';
import { useFormValidation } from '../../composables/useFormValidation';
import Button from '../ui/Button.vue';
import ConfirmationModal from '../modals/ConfirmationModal.vue';
import { useOrderStore } from '../../stores/orderStore';
import OrderFormFields from './OrderFormFields.vue';

// Form data
const formData = ref<OrderFormData>({
  buyerName: '',
  paymentMethod: undefined, // Inicialmente nenhum método selecionado
  contactNumber: '',
  addressOrCongregation: '',
  observations: '',
  numTickets: 0 // Iniciar com zero para não mostrar valor no input
});

// Estados do formulário
const isSubmitting = ref(false);
const showConfirmation = ref(false);
const orderId = ref<string | null>(null);

// Composables
const { errors, validateFormField, isFormValid } = useFormValidation();
const { generatedNumbers, isGenerating, error: raffleError, generateUniqueNumbers, numbersPerOrder } = useRaffleNumbers();
const authStore = useAuthStore();
const orderStore = useOrderStore();

// Referência ao pedido criado para o modal de confirmação
const createdOrder = ref<any>(null);

// Faz validação dos campos antes de submit
const validateForm = () => {
  validateFormField('buyerName', formData.value.buyerName, {
    'Nome deve ter pelo menos 3 caracteres': value => validateName(value)
  });
  
  validateFormField<PaymentMethod | undefined>('paymentMethod', formData.value.paymentMethod, {
    'Selecione uma forma de pagamento': value => value !== undefined
  });
  
  validateFormField('contactNumber', formData.value.contactNumber, {
    'Formato inválido. Use: (00) 00000-0000': value => validatePhone(value)
  });
  
  validateFormField('addressOrCongregation', formData.value.addressOrCongregation, {
    'Este campo é obrigatório': value => !!value
  });
  
  // Validação para o campo numTickets
  validateFormField<string>('numTickets', formData.value.numTickets?.toString() || '', {
    'Selecione ou insira a quantidade de números': value => !!value && parseInt(value) > 0
  });
  
  return isFormValid();
};

// Formata o telefone durante a digitação
const formatContactNumber = (event: Event) => {
  const input = event.target as HTMLInputElement;
  formData.value.contactNumber = formatPhone(input.value);
};

// Atualizar dados do formulário do componente filho
const updateFormData = (newFormData: OrderFormData) => {
  formData.value = newFormData;
};

// Processa o envio do formulário
const submitForm = async () => {
  if (!validateForm()) return;
  
  try {
    isSubmitting.value = true;
    
    // Atualizar a quantidade de números a gerar com base no valor selecionado
    // Se não houver seleção, usar 5 como valor padrão
    if (formData.value.numTickets && formData.value.numTickets > 0) {
      // Setar a quantidade de números a gerar
      numbersPerOrder.value = formData.value.numTickets;
    } else {
      // Valor padrão se nenhum número for selecionado
      numbersPerOrder.value = 5;
      formData.value.numTickets = 5;
    }
    
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
    paymentMethod: undefined, // Redefinir para nenhum método selecionado
    contactNumber: '',
    addressOrCongregation: '',
    observations: '',
    numTickets: 0 // Resetar para 0 para que o campo fique vazio
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
    
    <!-- Form Fields Component -->
    <OrderFormFields
      :formData="formData"
      :errors="errors"
      @update:formData="updateFormData"
      @input-phone="formatContactNumber"
    />
    
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