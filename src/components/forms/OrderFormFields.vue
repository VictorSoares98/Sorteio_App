<script setup lang="ts">
import { PaymentMethod } from '../../types/order';
import type { OrderFormData } from '../../types/order';
import { formatPhone } from '../../utils/formatting';
import Input from '../ui/Input.vue';

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

const formatContactNumber = (event: Event) => {
  const input = event.target as HTMLInputElement;
  input.value = formatPhone(input.value);
  emit('input-phone', event);
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
    <div class="flex space-x-4">
      <label class="inline-flex items-center">
        <input 
          type="radio" 
          :checked="formData.paymentMethod === PaymentMethod.PIX"
          @change="updateFormData('paymentMethod', PaymentMethod.PIX)" 
          class="form-radio text-primary"
        />
        <span class="ml-2">Pix</span>
      </label>
      <label class="inline-flex items-center">
        <input 
          type="radio" 
          :checked="formData.paymentMethod === PaymentMethod.DINHEIRO"
          @change="updateFormData('paymentMethod', PaymentMethod.DINHEIRO)" 
          class="form-radio text-primary"
        />
        <span class="ml-2">Dinheiro</span>
      </label>
    </div>
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
    ></textarea>
  </div>
</template>
