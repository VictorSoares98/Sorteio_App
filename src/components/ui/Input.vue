<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
  },
  id: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  maxlength: {
    type: [String, Number],
    default: null
  },
  autocomplete: {
    type: String,
    default: 'off'
  },
  helpText: {
    type: String,
    default: ''
  }
});

// Emitir evento para atualizar o valor no componente pai
const emit = defineEmits(['update:modelValue', 'blur', 'focus', 'input']);

// Computar classes do input com base nos props e estado
const inputClasses = computed(() => [
  'w-full px-3 py-2 border rounded-md focus:outline-none transition-colors',
  props.error 
    ? 'border-red-300 focus:ring-red-200 focus:border-red-400 bg-red-50' 
    : 'border-gray-300 focus:ring-primary focus:border-primary',
  props.disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : '',
  props.readonly ? 'bg-gray-50 cursor-default' : ''
]);

// Atualizar o valor quando o input mudar
const updateValue = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', props.type === 'number' ? Number(target.value) : target.value);
  emit('input', event);
};

// Gerar ID único se não for fornecido
const inputId = computed(() => {
  return props.id || `input-${Math.random().toString(36).substr(2, 9)}`;
});
</script>

<template>
  <div class="mb-4">
    <!-- Label -->
    <label 
      v-if="label" 
      :for="inputId" 
      class="block text-gray-700 text-sm font-medium mb-2"
    >
      {{ label }}
      <span v-if="required" class="text-red-500 ml-1">*</span>
    </label>
    
    <!-- Input -->
    <input
      :id="inputId"
      :name="name || inputId"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :readonly="readonly"
      :maxlength="maxlength"
      :autocomplete="autocomplete"
      :class="inputClasses"
      @input="updateValue"
      @blur="$emit('blur', $event)"
      @focus="$emit('focus', $event)"
    />
    
    <!-- Texto de ajuda -->
    <p 
      v-if="helpText && !error" 
      class="mt-1 text-xs text-gray-500"
    >
      {{ helpText }}
    </p>
    
    <!-- Mensagem de erro -->
    <p 
      v-if="error" 
      class="mt-1 text-xs text-red-600 flex items-center"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      {{ error }}
    </p>
  </div>
</template>
