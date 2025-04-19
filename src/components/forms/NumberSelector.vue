<script setup lang="ts">
import { ref, watch } from 'vue';
import { MAX_NUMBERS_PER_REQUEST } from '../../utils/constants';

const props = defineProps<{
  modelValue: number;
  error?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

// Iniciar com string vazia para mostrar o placeholder
const inputValue = ref<string>('');
const presetOptions = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

// Atualizar o inputValue quando o modelValue mudar externamente
watch(() => props.modelValue, (newValue) => {
  // Apenas atualizar se o valor for positivo, caso contrário manter vazio
  inputValue.value = newValue > 0 ? newValue.toString() : '';
});

// Atualizar o valor quando o input mudar
const updateValue = (event: Event) => {
  const target = event.target as HTMLInputElement;
  let value = target.value;
  
  // Permitir apenas números
  if (value) {
    const numericValue = value.replace(/\D/g, '');
    
    if (value !== numericValue) {
      // Se o valor tinha caracteres não numéricos, atualiza o campo
      target.value = numericValue;
      value = numericValue;
    }
    
    // Limitar a 100 números
    const numberValue = parseInt(value, 10);
    if (numberValue > MAX_NUMBERS_PER_REQUEST) {
      value = MAX_NUMBERS_PER_REQUEST.toString();
      target.value = value;
    }
    
    // Não permitir zero
    if (numberValue === 0) {
      value = '';
      target.value = '';
    }
  }
  
  inputValue.value = value;
  emit('update:modelValue', value ? parseInt(value, 10) : 0);
};

// Selecionar um valor pré-definido
const selectValue = (value: number) => {
  inputValue.value = value.toString();
  emit('update:modelValue', value);
};

// Limpar a seleção
const clearValue = () => {
  inputValue.value = '';
  emit('update:modelValue', 0);
};
</script>

<template>
  <div class="mb-6">
    <h3 class="form-label">
      Selecionar Quantidade de Números <span class="text-danger">*</span>
    </h3>
    
    <!-- Mensagem informativa sobre o limite -->
    <p class="text-sm text-gray-600 mb-2">
      <span class="font-medium">Atenção:</span> O limite máximo por pedido é de 100 números.
    </p>
    
    <!-- Input para valor manual -->
    <div class="flex mb-3">
      <input
        id="number-ticket-value"
        name="number-ticket-value"
        type="text"
        :value="inputValue"
        @input="updateValue"
        placeholder="Inserir Valor"
        class="form-input flex-grow pr-10"
        :class="{'border-danger focus:border-danger focus:ring-danger': error}"
        maxlength="3"
      />
      <button 
        type="button"
        @click="clearValue" 
        class="ml-2 bg-gray-200 hover:bg-gray-300 p-2 rounded-md"
        aria-label="Limpar valor"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
    
    <p v-if="error" class="mt-1 text-sm text-danger">{{ error }}</p>
    
    <!-- Botões com valores pré-definidos -->
    <div class="grid grid-cols-5 gap-2 md:grid-cols-10">
      <button
        v-for="option in presetOptions"
        :key="option"
        type="button"
        @click="selectValue(option)"
        :class="[
          'rounded-lg py-2 md:py-3 px-1 text-sm md:text-base flex items-center justify-center transition-colors',
          inputValue === option.toString() 
            ? 'bg-primary text-white' 
            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
        ]"
      >
        {{ option }}
      </button>
    </div>
  </div>
</template>
