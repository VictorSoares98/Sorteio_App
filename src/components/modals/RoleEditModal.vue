<script setup lang="ts">
import { ref, watch } from 'vue';
import Modal from '../ui/Modal.vue';
import { UserRole } from '../../types/user';

const props = defineProps<{
  show: boolean;
  userId?: string;
  initialRole?: UserRole;
  roleNames: Record<string, string>;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [userId: string, newRole: UserRole];
}>();

const selectedRole = ref<UserRole | ''>(props.initialRole || '');

// Adicionar um observador para atualizar o selectedRole quando initialRole mudar
watch(() => props.initialRole, (newValue) => {
  selectedRole.value = newValue || ''; // Sempre garantir um valor válido
});

const handleClose = () => {
  emit('close');
};

const handleConfirm = () => {
  if (props.userId && selectedRole.value) {
    emit('confirm', props.userId, selectedRole.value as UserRole);
  }
};
</script>

<template>
  <Modal 
    :show="show"
    title="Alterar Função do Usuário"
    :closeOnClickOutside="true"
    @close="handleClose"
  >
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Nova Função
      </label>
      <select 
        v-model="selectedRole"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
      >
        <option value="" disabled>Selecione uma função</option>
        <option v-for="(label, role) in roleNames" :key="role" :value="role">
          {{ label }}
        </option>
      </select>
    </div>
    
    <template #footer>
      <button 
        @click="handleClose"
        class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
      >
        Cancelar
      </button>
      <button 
        @click="handleConfirm"
        class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        :disabled="!selectedRole"
      >
        Confirmar
      </button>
    </template>
  </Modal>
</template>
