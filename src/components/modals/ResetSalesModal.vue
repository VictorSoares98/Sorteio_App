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
      <div class="bg-red-50 p-4 rounded-lg border border-red-200">
        <h3 class="text-lg font-medium text-red-700 mb-2">⚠️ ATENÇÃO: Ação irreversível</h3>
        <p class="text-red-600">
          Você está prestes a excluir TODAS as vendas do sistema. Esta ação não pode ser desfeita.
        </p>
      </div>
      
      <p class="text-gray-700">
        Para confirmar, digite exatamente <strong>"RESETAR VENDAS"</strong> no campo abaixo:
      </p>
      
      <div>
        <input
          v-model="confirmationText"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
          placeholder="Digite RESETAR VENDAS"
        />
        <p v-if="error" class="mt-1 text-red-600 text-sm">{{ error }}</p>
      </div>
    </div>
    
    <template #footer>
      <button 
        @click="handleClose"
        class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
      >
        Cancelar
      </button>
      <Button 
        @click="handleConfirm"
        variant="danger"
      >
        Confirmar Reset
      </Button>
    </template>
  </Modal>
</template>
