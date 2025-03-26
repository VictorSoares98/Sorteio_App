<script setup lang="ts">
import { PaymentMethod, type OrderFormData } from '../../types/order';
import { formatPhone } from '../../utils/formatters';
import Input from '../ui/Input.vue';
import NumberSelector from './NumberSelector.vue';

const props = defineProps<{
  formData: OrderFormData;
  errors: Record<string, string>;
}>();

const emit = defineEmits<{
  'update:formData': [formData: OrderFormData];
  'input-phone': [event: Event];
}>();

const updateFormData = (field: keyof OrderFormData, value: any) => {
  emit('update:formData', {
    ...props.formData,
    [field]: value
  });
};

const updateNumTickets = (value: number) => {
  emit('update:formData', {
    ...props.formData,
    numTickets: value
  });
};

const formatContactNumber = (event: Event) => {
  const input = event.target as HTMLInputElement;
  // Obtém o valor atual e a posição do cursor antes da formatação
  const currentValue = input.value;
  const cursorPosition = input.selectionStart;
  
  // Remove caracteres não numéricos para contar quantos dígitos temos
  const cleanedValue = currentValue.replace(/\D/g, '');
  
  // Formata o valor
  input.value = formatPhone(cleanedValue);
  
  // Calcula a nova posição do cursor
  const newCursorPosition = calculateCursorPosition(currentValue, input.value, cursorPosition || 0);
  
  // Restaura a posição do cursor
  input.setSelectionRange(newCursorPosition, newCursorPosition);
  
  // Emite o evento para o componente pai
  emit('input-phone', event);
};

// Função auxiliar para calcular a nova posição do cursor
const calculateCursorPosition = (oldValue: string, newValue: string, oldPosition: number): number => {
  // Se estamos no final do campo, manter no final
  if (oldPosition === oldValue.length) {
    return newValue.length;
  }
  
  // Se a formatação adicionou caracteres, ajustar a posição
  if (newValue.length > oldValue.length) {
    // Verifica se temos parênteses ou traço na posição atual
    if (newValue[oldPosition] === ')' || newValue[oldPosition] === '-' || newValue[oldPosition] === ' ') {
      return oldPosition + 1;
    }
  }
  
  return oldPosition;
};
</script>

<template>
  <!-- Buyer Name -->
  <Input
    id="buyerName"
    :modelValue="formData.buyerName"
    @update:modelValue="value => updateFormData('buyerName', value)"
    label="Nome do Comprador"
    required
    :error="errors.buyerName || ''"
  />
  
  <!-- Payment Method -->
  <div class="mb-4">
    <label class="form-label">
      Forma de Pagamento <span class="text-danger">*</span>
    </label>
    <div class="flex w-full gap-2">
      <button 
        type="button" 
        @click="updateFormData('paymentMethod', PaymentMethod.PIX)"
        class="w-1/2 py-2 px-4 text-center rounded transition-colors"
        :class="formData.paymentMethod === PaymentMethod.PIX 
          ? 'bg-primary text-white' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
      >
        Pix
      </button>
      <button 
        type="button" 
        @click="updateFormData('paymentMethod', PaymentMethod.DINHEIRO)"
        class="w-1/2 py-2 px-4 text-center rounded transition-colors"
        :class="formData.paymentMethod === PaymentMethod.DINHEIRO 
          ? 'bg-primary text-white' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
      >
        Dinheiro
      </button>
    </div>
    <p v-if="errors.paymentMethod" class="mt-1 text-sm text-danger">
      {{ errors.paymentMethod }}
    </p>
  </div>
  
  <!-- Contact Number -->
  <Input
    id="contactNumber"
    :modelValue="formData.contactNumber"
    @update:modelValue="value => updateFormData('contactNumber', value)"
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
    :modelValue="formData.addressOrCongregation"
    @update:modelValue="value => updateFormData('addressOrCongregation', value)"
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
      :value="formData.observations"
      @input="e => updateFormData('observations', (e.target as HTMLTextAreaElement).value)"
      class="form-input"
      rows="3"
      style="min-height: 38px;"
    ></textarea>
  </div>
  
  <!-- Number Selector -->
  <NumberSelector 
    :modelValue="formData.numTickets || 0"
    @update:modelValue="updateNumTickets"
    :error="errors.numTickets || ''"
  />
</template>