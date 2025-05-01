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

const emit = defineEmits(['close', 'toggle-block']);
const userStore = useUserStore();
const user = ref<any>(null);
const isBlocked = ref(false);
const loading = ref(false);
const blockReason = ref('');
const blockDuration = ref<number>(7); // Padrão: 7 dias

// Carregar dados do usuário quando o modal for aberto
watch(() => props.show, async (newVal) => {
  if (newVal && props.userId) {
    loading.value = true;
    try {
      user.value = await userStore.fetchUserById(props.userId);
      if (user.value) {
        isBlocked.value = user.value.isBlocked || false;
        blockReason.value = user.value.blockReason || '';
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    } finally {
      loading.value = false;
    }
  }
});

// Opções de duração para bloqueio
const blockDurationOptions = [
  { value: 1, label: '1 dia' },
  { value: 3, label: '3 dias' },
  { value: 7, label: '7 dias' },
  { value: 15, label: '15 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
  { value: 0, label: 'Permanente' }
];

// Confirmar a ação de bloqueio/desbloqueio
const confirmAction = () => {
  if (props.userId) {
    // Se estamos desbloqueando, não precisamos de motivo ou duração
    if (isBlocked.value) {
      emit('toggle-block', props.userId, false);
    } else {
      // Caso contrário, estamos bloqueando, então enviamos o motivo e duração
      emit('toggle-block', props.userId, true, blockReason.value, blockDuration.value);
    }
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
          <svg v-if="isBlocked" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-3V7a3 3 0 00-6 0v3m12 0a2 2 0 012 2v3a2 2 0 01-2 2H7a2 2 0 01-2-2v-3a2 2 0 012-2h9z" />
          </svg>
          {{ isBlocked ? 'Desbloquear Usuário' : 'Bloquear Usuário' }}
        </h3>
        <p class="text-sm text-gray-500 mt-1">{{ user?.displayName || 'Usuário' }}</p>
      </div>
      
      <!-- Content -->
      <div class="p-4 flex-grow overflow-auto">
        <div v-if="loading" class="flex justify-center items-center h-20">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
        <div v-else>
          <!-- Mensagem de confirmação para desbloquear -->
          <div v-if="isBlocked" class="bg-green-50 border border-green-200 p-3 rounded-md mb-4">
            <p class="text-green-700">Você está prestes a <strong>desbloquear</strong> este usuário, permitindo que ele volte a acessar o sistema.</p>
          </div>
          
          <!-- Form para bloquear -->
          <div v-else>
            <div class="bg-red-50 border border-red-200 p-3 rounded-md mb-4">
              <p class="text-red-700">Você está prestes a <strong>bloquear</strong> este usuário, impedindo-o de acessar o sistema.</p>
            </div>
            
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Motivo do Bloqueio
              </label>
              <textarea 
                v-model="blockReason"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Explique o motivo do bloqueio..."
              ></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Duração do Bloqueio
              </label>
              <select
                v-model="blockDuration"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option 
                  v-for="option in blockDurationOptions" 
                  :key="option.value" 
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>
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
          @click="confirmAction"
          :class="[
            'px-4 py-2 text-white rounded-md text-sm font-medium focus:outline-none',
            isBlocked ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
          ]"
          :disabled="loading"
        >
          {{ isBlocked ? 'Confirmar Desbloqueio' : 'Confirmar Bloqueio' }}
        </button>
      </div>
    </div>
  </div>
</template>
