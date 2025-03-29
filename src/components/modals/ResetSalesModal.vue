<script setup lang="ts">
import { ref } from 'vue';
import Modal from '../ui/Modal.vue';
import Button from '../ui/Button.vue';

defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [];
}>();

const confirmationText = ref('');
const error = ref('');
const CONFIRMATION_CODE = 'RESETAR VENDAS';
const isConfirmDisabled = ref(true);

const handleClose = () => {
  confirmationText.value = '';
  error.value = '';
  emit('close');
};

const handleConfirm = () => {
  if (confirmationText.value === CONFIRMATION_CODE) {
    emit('confirm');
    confirmationText.value = '';
    error.value = '';
  } else {
    error.value = 'Texto de confirmação incorreto. Digite exatamente "RESETAR VENDAS".';
  }
};

// Verificar se o texto coincide com o código de confirmação
const validateConfirmationText = () => {
  isConfirmDisabled.value = confirmationText.value !== CONFIRMATION_CODE;
};
</script>

<template>
  <Modal 
    :show="show" 
    title="Confirmar Reset de Vendas"
    :closeOnClickOutside="true"
    @close="handleClose"
    variant="danger"
  >
    <div class="space-y-4">
      <div class="bg-red-50 p-4 rounded-lg border border-red-300 shadow-sm">
        <div class="flex items-start">
          <div class="ml-3">
            <h3 class="text-lg font-bold text-red-800 mb-2">⚠️ ATENÇÃO: Ação irreversível</h3>
            <p class="text-red-700">
              Você está prestes a excluir <span class="font-bold">TODAS</span> as vendas do sistema. Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>
      </div>
      
      <p class="text-gray-700 font-medium">
        Para confirmar, digite exatamente <strong class="font-bold text-red-700">"RESETAR VENDAS"</strong> no campo abaixo:
      </p>
      
      <div>
        <input
          v-model="confirmationText"
          @input="validateConfirmationText"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
          placeholder="Digite RESETAR VENDAS"
          autocomplete="off"
        />
        <p v-if="error" class="mt-1 text-red-600 text-sm font-medium">{{ error }}</p>
      </div>
    </div>
    
    <template #footer>
      <div class="flex justify-between w-full">
        <button 
          @click="handleClose"
          class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <Button 
          @click="handleConfirm"
          variant="danger"
          :disabled="isConfirmDisabled"
          class="ml-3 px-4 py-2 transition-all duration-200 reset-button text-white hover:bg-[#FEA1A1]"
          :class="{
            'opacity-50 cursor-not-allowed': isConfirmDisabled, 
            'transform hover:-translate-y-1': !isConfirmDisabled
          }"
        >
          Confirmar Reset
        </Button>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.reset-button {
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
  background-color: #e11d48; /* Vermelho mais intenso (red-600) */
  color: white;
}

.reset-button:hover {
  box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
  background-color: #FEA1A1 !important;
}
</style>
