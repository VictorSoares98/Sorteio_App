<script setup lang="ts">
import { ref, watch } from 'vue';
import { UserRole } from '../../types/user';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  userId: {
    type: String,
    default: undefined
  },
  initialRole: {
    type: String as () => UserRole | undefined,
    default: undefined
  },
  roleNames: {
    type: Object as () => Record<string, string>,
    default: () => ({})
  }
});

const emit = defineEmits(['close', 'confirm']);
const selectedRole = ref<UserRole>(props.initialRole || UserRole.USER);

// Atualizar papel selecionado quando o componente receber novo papel inicial
watch(() => props.initialRole, (newRole) => {
  if (newRole) {
    selectedRole.value = newRole;
  }
});

// Confirmar alteração de papel
const confirmRoleChange = () => {
  if (props.userId) {
    emit('confirm', props.userId, selectedRole.value);
  }
};

// Fechar modal sem salvar
const closeModal = () => {
  emit('close');
};

// Lista de papéis disponíveis
const availableRoles = [
  { value: UserRole.USER, label: props.roleNames[UserRole.USER] || 'Membro' },
  { value: UserRole.TESOUREIRO, label: props.roleNames[UserRole.TESOUREIRO] || 'Tesoureiro' },
  { value: UserRole.SECRETARIA, label: props.roleNames[UserRole.SECRETARIA] || 'Secretaria' },
  { value: UserRole.ADMIN, label: props.roleNames[UserRole.ADMIN] || 'Administrador' },
];
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <!-- Header -->
      <div class="mb-4">
        <h3 class="text-lg font-medium text-gray-900">Alterar Função do Usuário</h3>
        <p class="text-sm text-gray-500 mt-1">Selecione a nova função para este usuário</p>
      </div>
      
      <!-- Content -->
      <div class="mb-6">
        <div class="space-y-3">
          <div v-for="role in availableRoles" :key="role.value" class="flex items-center">
            <input
              type="radio"
              :id="`role-${role.value}`"
              :value="role.value"
              v-model="selectedRole"
              class="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
            />
            <label :for="`role-${role.value}`" class="ml-3 block text-gray-700">
              {{ role.label }}
            </label>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="flex justify-end space-x-3">
        <button
          @click="closeModal"
          class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          @click="confirmRoleChange"
          class="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-md text-sm font-medium focus:outline-none"
        >
          Confirmar
        </button>
      </div>
    </div>
  </div>
</template>
