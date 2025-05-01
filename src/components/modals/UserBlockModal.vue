<script setup lang="ts">
import { ref, watch } from 'vue';
import { useUserStore } from '../../stores/userStore';
import Button from '../ui/Button.vue';
import Modal from '../ui/Modal.vue';

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

const emit = defineEmits(['close', 'toggle-block']);
const userStore = useUserStore();
const blockReason = ref('');
const blockDuration = ref<number | null>(7);
const userIsBlocked = ref(false);
const loading = ref(false);
const userName = ref('');
const showConfirmModal = ref(false);

// Carregar status atual do usuário quando o modal for aberto
watch(() => props.show, async (newVal) => {
  if (newVal && props.userId) {
    loading.value = true;
    try {
      const user = await userStore.fetchUserById(props.userId);
      if (user) {
        userIsBlocked.value = user.isBlocked || false;
        blockReason.value = user.blockReason || '';
        userName.value = user.displayName || user.email || 'Usuário';
      }
    } catch (error) {
      console.error('Erro ao carregar status do usuário:', error);
    } finally {
      loading.value = false;
    }
  }
});

// Fechar modal
const closeModal = () => {
  emit('close');
};

// Mostrar diálogo de confirmação
const validateAndShowConfirm = () => {
  if (!userIsBlocked.value && !blockReason.value.trim()) {
    showConfirmModal.value = true; // Show confirmation modal with mandatory field notice
    return;
  }
  
  // Se não precisar de confirmação, prosseguir
  handleToggleBlock();
};

// Bloquear/Desbloquear usuário
const handleToggleBlock = () => {
  if (props.userId) {
    emit('toggle-block', props.userId, !userIsBlocked.value, blockReason.value, blockDuration.value);
  }
};

// Fechar modal de confirmação
const closeConfirmModal = () => {
  showConfirmModal.value = false;
};

// Resetar o formulário quando o modal fechar
watch(() => props.show, (newVal) => {
  if (!newVal) {
    blockReason.value = '';
    blockDuration.value = null;
    showConfirmModal.value = false;
  }
});
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <!-- Header -->
      <div class="mb-4">
        <h3 class="text-lg font-medium" :class="userIsBlocked ? 'text-green-600' : 'text-red-600'">
          {{ userIsBlocked ? 'Desbloquear Usuário' : 'Bloquear Usuário' }}
        </h3>
        <p class="text-sm text-gray-500">
          {{ userIsBlocked 
            ? `Permitir que ${userName} volte a acessar o sistema?` 
            : `Restringir o acesso de ${userName} ao sistema` }}
        </p>
        <!-- Validation Message -->
        <p v-if="!blockReason.trim()" class="text-sm text-red-600 mt-1">
          O motivo do bloqueio é obrigatório.
        </p>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-4">
        <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <p class="mt-2 text-sm text-gray-500">Carregando informações...</p>
      </div>
      
      <!-- Block Form -->
      <div v-else>
        <!-- Block Reason -->
        <div v-if="!userIsBlocked" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Motivo do Bloqueio
          </label>
          <textarea
            v-model="blockReason"
            placeholder="Explique o motivo do bloqueio..."
            class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary min-h-[100px] resize-y"
          ></textarea>
        </div>
        
        <!-- Block Duration (Future implementation) -->
        <div v-if="!userIsBlocked" class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Duração do Bloqueio
          </label>
          <select
            v-model="blockDuration"
            class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
          >
            <option :value="null">Permanente</option>
            <option :value="1">1 dia</option>
            <option :value="7">7 dias</option>
            <option :value="30">30 dias</option>
          </select>
        </div>
        
        <!-- Warning Message -->
        <div v-if="!userIsBlocked" class="bg-yellow-50 border border-yellow-200 p-3 rounded-md mb-4">
          <p class="text-sm text-yellow-800">
            <span class="font-medium">Atenção:</span> {{ userName }} será impedido de fazer login e suas sessões ativas serão encerradas.
          </p>
        </div>
        
        <!-- Current Block Reason -->
        <div v-if="userIsBlocked && blockReason" class="mb-4">
          <h4 class="text-sm font-medium text-gray-700">Motivo do Bloqueio Atual:</h4>
          <p class="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-sm">{{ blockReason }}</p>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="mt-6 flex justify-end space-x-2">
        <Button 
          @click="closeModal" 
          variant="secondary"
          size="sm"
        >
          Cancelar
        </Button>
        <Button 
          @click="validateAndShowConfirm" 
          :variant="userIsBlocked ? 'success' : 'danger'"
          :disabled="!userIsBlocked && !blockReason.trim()"
          size="sm"
        >
          {{ userIsBlocked ? 'Desbloquear' : 'Bloquear' }}
        </Button>
      </div>
    </div>
  </div>
  
  <!-- Modal de confirmação usando o componente existente -->
  <Modal
    v-if="showConfirmModal"
    :show="showConfirmModal"
    title="Campo Obrigatório"
    variant="warning"
    @close="closeConfirmModal"
    @confirm="closeConfirmModal"
    :hideFooter="false"
  >
    <p>Por favor, informe o motivo do bloqueio antes de continuar.</p>
    
    <template #footer>
      <Button 
        @click="closeConfirmModal"
        variant="primary"
        size="sm"
      >
        OK
      </Button>
    </template>
  </Modal>
</template>
