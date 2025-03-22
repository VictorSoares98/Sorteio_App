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
  required: {
    type: Boolean,
    default: false
  },
  id: {
    type: String,
    default: () => `input-${Math.random().toString(36).slice(2, 11)}`
  },
  error: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue']);

const updateValue = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
};

const hasError = computed(() => !!props.error);
</script>

<template>
  <div class="mb-4">
    <label v-if="label" :for="id" class="block text-gray-700 text-sm font-bold mb-2">
      {{ label }} <span v-if="required" class="text-danger">*</span>
    </label>
    
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      @input="updateValue"
      :placeholder="placeholder"
      :required="required"
      :class="[
        'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary focus:border-primary',
        hasError 
          ? 'border-danger focus:border-danger focus:ring-danger' 
          : 'border-gray-300'
      ]"
    />
    
    <p v-if="hasError" class="mt-1 text-sm text-danger">{{ error }}</p>
  </div>
</template>
