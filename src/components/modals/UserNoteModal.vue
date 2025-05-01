<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useUserStore } from '../../stores/userStore';
import Button from '../ui/Button.vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  userId: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'save']);
const userStore = useUserStore();
const noteText = ref('');
const loading = ref(false);
const userName = ref('');

// Verificar se o texto da nota está vazio
const isNoteTextEmpty = computed(() => {
  return !noteText.value || noteText.value.trim() === '';
});

// Carregar notas existentes quando o modal for aberto
watch(() => props.show, async (newVal) => {
  if (newVal && props.userId) {
    loading.value = true;
    try {
      const notes = await userStore.fetchUserNotes(props.userId);
      noteText.value = notes || '';
      
      // Buscar informações do usuário para exibir o nome
      const user = await userStore.fetchUserById(props.userId);
      if (user) {
        userName.value = user.displayName || user.email || 'Usuário';
      }
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
    } finally {
      loading.value = false;
    }
  }
});

// Fechar modal
const closeModal = () => {
  emit('close');
};

// Salvar nota - adicionada validação para evitar notas vazias
const saveNote = () => {
  if (props.userId && !isNoteTextEmpty.value) {
    emit('save', props.userId, noteText.value.trim());
  }
};

// Limpar nota
import ConfirmationModal from '../ui/Modal.vue';

const showConfirmation = ref(false);

const clearNote = () => {
  if (noteText.value.trim() !== '') {
    showConfirmation.value = true;
  }
};

const confirmClearNote = () => {
  noteText.value = '';
  showConfirmation.value = false;
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <!-- Header -->
      <div class="mb-4">
        <h3 class="text-lg font-medium text-gray-900">Notas do Usuário</h3>
        <p class="text-sm text-gray-500">
          Adicione notas administrativas sobre {{ userName }}
        </p>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-4">
        <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <p class="mt-2 text-sm text-gray-500">Carregando notas...</p>
      </div>
      
      <!-- Note Content -->
      <div v-else>
        <textarea
          v-model="noteText"
          placeholder="Escreva suas notas aqui..."
          class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary min-h-[150px] resize-y"
        ></textarea>
        
        <!-- Mensagem de aviso quando o campo estiver vazio -->
        <p v-if="isNoteTextEmpty" class="mt-2 text-xs text-amber-600">
          Digite alguma informação para salvar as notas.
        </p>
      </div>
      
      <!-- Actions -->
      <div class="mt-6 flex items-center justify-between">
        <button
          @click="clearNote"
          type="button"
          class="text-red-600 hover:text-red-800 text-sm"
        >
          Limpar Notas
        </button>

        <!-- Confirmation Modal -->
        <ConfirmationModal
          v-if="showConfirmation"
          title="Confirmação"
          message="Tem certeza que deseja limpar todas as notas?"
          @confirm="confirmClearNote"
          @cancel="showConfirmation = false"
        />
        
        <div class="flex space-x-2">
          <Button 
            @click="closeModal" 
            variant="secondary"
            size="sm"
          >
            Cancelar
          </Button>
          <Button 
            @click="saveNote" 
            variant="primary"
            size="sm"
            :disabled="isNoteTextEmpty"
            :class="{ 'opacity-50 cursor-not-allowed': isNoteTextEmpty }"
          >
            Salvar Notas
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
