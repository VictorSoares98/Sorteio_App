<script setup lang="ts">
import { ref, watch } from 'vue';
import { useUserStore } from '../../stores/userStore';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  userId: {
    type: String,
    default: undefined
  }
});

const emit = defineEmits(['close', 'save']);
const userStore = useUserStore();
const note = ref('');
const userName = ref('');
const loading = ref(false);

// Carregar notas existentes quando o modal for aberto
watch(() => props.show, async (newVal) => {
  if (newVal && props.userId) {
    loading.value = true;
    try {
      // Buscar usuário atual para exibir o nome
      const user = await userStore.fetchUserById(props.userId);
      if (user) {
        userName.value = user.displayName || user.email || 'Usuário';
      }
      
      // Buscar notas existentes
      await userStore.fetchUserNotes(props.userId);
      note.value = userStore.userNotes[props.userId] || '';
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
    } finally {
      loading.value = false;
    }
  }
});

// Salvar a nota
const saveNote = () => {
  if (props.userId) {
    emit('save', props.userId, note.value);
  }
};

// Fechar o modal
const closeModal = () => {
  emit('close');
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="p-4 border-b">
        <h3 class="text-lg font-medium text-gray-800 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Notas Administrativas
        </h3>
        <p class="text-sm text-gray-500 mt-1">{{ userName }}</p>
      </div>
      
      <!-- Content -->
      <div class="p-4 flex-grow overflow-auto">
        <div v-if="loading" class="flex justify-center items-center h-20">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
        <div v-else>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Adicione ou edite notas administrativas para este usuário:
          </label>
          <textarea 
            v-model="note"
            rows="6"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="Escreva suas notas aqui..."
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">
            Estas notas são visíveis apenas para administradores e não são exibidas ao usuário.
          </p>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="p-4 border-t flex justify-end space-x-3">
        <button
          @click="closeModal"
          class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          @click="saveNote"
          class="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-md text-sm font-medium focus:outline-none"
          :disabled="loading"
        >
          Salvar
        </button>
      </div>
    </div>
  </div>
</template>
