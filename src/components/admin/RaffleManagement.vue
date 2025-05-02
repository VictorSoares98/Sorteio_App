<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { 
  fetchAllRaffles, 
  fetchRaffleById, 
  setActiveRaffle, 
  deleteRaffle,
  cancelRaffle,
  pauseRaffle,
  resumeRaffle,
  type RaffleData 
} from '../../services/raffle';
import { createDefaultRaffle } from '../../utils/raffleFactory';
import { DateTime } from 'luxon';
import Card from '../ui/Card.vue';
import Alert from '../ui/Alert.vue';
import Modal from '../ui/Modal.vue';
import { useRaffleValidation } from '../../composables/useRaffleValidation';
import RaffleEditor from '../raffle/RaffleEditor.vue';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types/user';

// Estado local
const raffles = ref<RaffleData[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const selectedRaffle = ref<RaffleData | null>(null);
const isEditing = ref(false);
const showDeleteModal = ref(false);
const raffleToDelete = ref<string | null>(null);
const showNewRaffleForm = ref(false);

// Novos estados para cancelamento e pausa
const showCancelModal = ref(false);
const showPauseModal = ref(false);
const raffleToCancel = ref<string | null>(null);
const raffleToPause = ref<string | null>(null);
const cancelReason = ref('');
const pauseReason = ref('');
const processingAction = ref(false);

// Estado para exclusão
const isDeleting = ref(false);
const deleteError = ref<string | null>(null);

// Pegar os métodos do composable de validação
const { validateForm } = useRaffleValidation();

// Buscar todos os sorteios ao montar o componente
onMounted(async () => {
  await loadRaffles();
});

// Função para carregar todos os sorteios
const loadRaffles = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    // Obter os dados do usuário atual para filtros
    const userId = authStore.currentUser?.id || null;
    const userAffiliationId = authStore.currentUser?.affiliatedToId || null;
    
    // Chamar fetchAllRaffles com os parâmetros corretos
    raffles.value = await fetchAllRaffles(false, userId, userAffiliationId, isAdmin.value);
    
    console.log(`[RaffleManagement] ${raffles.value.length} sorteios carregados`);
  } catch (err) {
    console.error('[RaffleManagement] Erro ao carregar sorteios:', err);
    error.value = 'Não foi possível carregar a lista de sorteios.';
  } finally {
    loading.value = false;
  }
};

// Formatar data para exibição
const formatDate = (dateString: string) => {
  if (!dateString) return 'Data não definida';
  
  const date = DateTime.fromISO(dateString);
  return date.setLocale('pt-BR').toLocaleString(DateTime.DATE_FULL);
};

// Editar um sorteio específico
const editRaffle = async (raffleId: string) => {
  try {
    loading.value = true;
    const raffle = await fetchRaffleById(raffleId);
    
    if (raffle) {
      selectedRaffle.value = raffle;
      isEditing.value = true;
    } else {
      error.value = 'Sorteio não encontrado.';
    }
  } catch (err) {
    console.error(`[RaffleManagement] Erro ao buscar sorteio ${raffleId}:`, err);
    error.value = 'Erro ao carregar os dados do sorteio.';
  } finally {
    loading.value = false;
  }
};

// Verificar se o usuário está afiliado a alguém
const authStore = useAuthStore();
const isAffiliated = computed(() => {
  return !!authStore.currentUser?.affiliatedTo;
});

// Verificar se o usuário pode criar sorteios (admin OU não afiliado)
const isAdmin = computed(() => 
  authStore.currentUser?.role === UserRole.ADMIN || 
  authStore.currentUser?.role === UserRole.SECRETARIA || 
  authStore.currentUser?.role === UserRole.TESOUREIRO
);
const canCreateRaffles = computed(() => {
  return isAdmin.value || !isAffiliated.value;
});

// Criar um novo sorteio
const createNewRaffle = () => {
  // Verificar se o usuário pode criar sorteios
  if (!canCreateRaffles.value) {
    error.value = "Você não tem permissão para criar sorteios pois está vinculado a um grupo de afiliação.";
    return;
  }

  // Criar modelo padrão usando a fábrica
  const defaultRaffle = createDefaultRaffle();
  // Remover o ID fixo para que um novo seja gerado
  selectedRaffle.value = {
    ...defaultRaffle,
    id: '',
    isActive: false
  };
  
  showNewRaffleForm.value = true;
};

// Salvar as alterações de um sorteio
const saveRaffleChanges = async (updatedRaffle: RaffleData) => {
  try {
    loading.value = true;
    
    // Validar o sorteio
    const validationResult = validateForm(updatedRaffle);
    if (!validationResult.isValid) {
      error.value = validationResult.message ?? null;
      return;
    }
    
    // Log para depuração
    console.log('[RaffleManagement] Salvando sorteio:', 
      {
        id: updatedRaffle.id,
        title: updatedRaffle.title,
        createdBy: updatedRaffle.createdBy,
        visibility: updatedRaffle.visibility || 'não definida'
      }
    );
    
    // Garantir que a visibilidade esteja definida
    if (!updatedRaffle.visibility) {
      updatedRaffle.visibility = 'universal';
      console.log('[RaffleManagement] Definindo visibilidade padrão como universal');
    }
    
    // Importar o serviço dinamicamente para reduzir o tamanho do bundle inicial
    const { saveRaffleData } = await import('../../services/raffle');
    await saveRaffleData(updatedRaffle);
    
    success.value = 'Sorteio salvo com sucesso!';
    setTimeout(() => {
      success.value = null;
    }, 3000);
    
    // Atualizar a lista e fechar o formulário
    isEditing.value = false;
    showNewRaffleForm.value = false;
    selectedRaffle.value = null;
    
    // Recarregar a lista de sorteios
    await loadRaffles();

    console.log(`[RaffleManagement] Lista de sorteios atualizada: ${raffles.value.length} sorteios`);
    raffles.value.forEach(raffle => {
      console.log(`- ${raffle.id}: ${raffle.title} (visibilidade: ${raffle.visibility || 'não definida'})`);
    });
  } catch (err) {
    console.error('[RaffleManagement] Erro ao salvar sorteio:', err);
    error.value = 'Não foi possível salvar o sorteio.';
  } finally {
    loading.value = false;
  }
};

// Cancelar a edição
const cancelEdit = () => {
  isEditing.value = false;
  showNewRaffleForm.value = false;
  selectedRaffle.value = null;
};

// Confirmar exclusão de sorteio
const confirmDelete = (raffleId: string) => {
  raffleToDelete.value = raffleId;
  showDeleteModal.value = true;
  deleteError.value = null;
};

// Executar exclusão de sorteio
const executeDelete = async () => {
  if (!selectedRaffle.value?.id) return;
  
  isDeleting.value = true;
  deleteError.value = null;
  
  try {
    await deleteRaffle(selectedRaffle.value.id);
    showDeleteModal.value = false;
    await loadRaffles(); // Recarregar a lista de sorteios
    success.value = 'Sorteio excluído com sucesso!';
    setTimeout(() => {
      success.value = null;
    }, 3000);
  } catch (error) {
    console.error('Erro ao excluir sorteio:', error);
    deleteError.value = error instanceof Error 
      ? error.message 
      : 'Ocorreu um erro ao excluir o sorteio. Tente novamente.';
      
    // Adicionar tratamento específico para o erro BloomFilter
    if (error instanceof Error && error.message.includes('BloomFilter')) {
      deleteError.value = 'Erro de conexão com o servidor. Tente novamente em alguns instantes.';
    }
  } finally {
    isDeleting.value = false;
  }
};

// Cancelar exclusão
const cancelDelete = () => {
  showDeleteModal.value = false;
  raffleToDelete.value = null;
  deleteError.value = null;
};

// Definir sorteio como ativo
const activateRaffle = async (raffleId: string) => {
  try {
    loading.value = true;
    await setActiveRaffle(raffleId);
    
    success.value = 'Sorteio ativado com sucesso!';
    setTimeout(() => {
      success.value = null;
    }, 3000);
    
    // Recarregar a lista
    await loadRaffles();
  } catch (err) {
    console.error('[RaffleManagement] Erro ao ativar sorteio:', err);
    error.value = 'Não foi possível ativar o sorteio.';
  } finally {
    loading.value = false;
  }
};

// Confirmar cancelamento de sorteio
const confirmCancelRaffle = (raffleId: string) => {
  raffleToCancel.value = raffleId;
  cancelReason.value = '';
  showCancelModal.value = true;
};

// Executar cancelamento de sorteio
const executeCancelRaffle = async () => {
  if (!raffleToCancel.value) return;
  
  try {
    processingAction.value = true;
    await cancelRaffle(raffleToCancel.value, cancelReason.value);
    
    success.value = 'Sorteio cancelado com sucesso!';
    setTimeout(() => {
      success.value = null;
    }, 3000);
    
    showCancelModal.value = false;
    raffleToCancel.value = null;
    cancelReason.value = '';
    
    // Recarregar a lista
    await loadRaffles();
  } catch (err) {
    console.error('[RaffleManagement] Erro ao cancelar sorteio:', err);
    error.value = (err as Error).message || 'Não foi possível cancelar o sorteio.';
  } finally {
    processingAction.value = false;
  }
};

// Confirmar pausa de sorteio
const confirmPauseRaffle = (raffleId: string) => {
  raffleToPause.value = raffleId;
  pauseReason.value = '';
  showPauseModal.value = true;
};

// Executar pausa de sorteio
const executePauseRaffle = async () => {
  if (!raffleToPause.value) return;
  
  try {
    processingAction.value = true;
    // Função importada estaticamente no topo do arquivo
    await pauseRaffle(raffleToPause.value, pauseReason.value);
    
    success.value = 'Sorteio pausado com sucesso!';
    setTimeout(() => {
      success.value = null;
    }, 3000);
    
    showPauseModal.value = false;
    raffleToPause.value = null;
    pauseReason.value = '';
    
    // Recarregar a lista
    await loadRaffles();
  } catch (err) {
    console.error('[RaffleManagement] Erro ao pausar sorteio:', err);
    error.value = (err as Error).message || 'Não foi possível pausar o sorteio.';
  } finally {
    processingAction.value = false;
  }
};

// Retomar sorteio pausado
const resumeRaffleAction = async (raffleId: string) => {
  try {
    loading.value = true;
    await resumeRaffle(raffleId);
    
    success.value = 'Sorteio retomado com sucesso!';
    setTimeout(() => {
      success.value = null;
    }, 3000);
    
    // Recarregar a lista
    await loadRaffles();
  } catch (err) {
    console.error('[RaffleManagement] Erro ao retomar sorteio:', err);
    error.value = (err as Error).message || 'Não foi possível retomar o sorteio.';
  } finally {
    loading.value = false;
  }
};

// Cancelar ações nos modais
const closeCancelModal = () => {
  showCancelModal.value = false;
  raffleToCancel.value = null;
  cancelReason.value = '';
};

const closePauseModal = () => {
  showPauseModal.value = false;
  raffleToPause.value = null;
  pauseReason.value = '';
};

// Verifica se há um sorteio ativo
const hasActiveRaffle = computed(() => {
  return raffles.value.some(raffle => raffle.isActive);
});

// Obter o sorteio ativo
const activeRaffle = computed(() => {
  return raffles.value.find(raffle => raffle.isActive);
});
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold mb-6">Gerenciamento de Sorteios</h2>
    
    <!-- Alertas -->
    <Alert v-if="error" type="error" :message="error" dismissible class="mb-4" />
    <Alert v-if="success" type="success" :message="success" dismissible class="mb-4" />
    
    <!-- Estado de carregamento -->
    <div v-if="loading && !isEditing && !showNewRaffleForm" class="flex justify-center my-8">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
    </div>
    
    <!-- Formulário de edição de sorteio -->
    <div v-else-if="isEditing && selectedRaffle">
      <div class="mb-4 flex justify-between items-center">
        <h3 class="text-xl font-semibold">Editar Sorteio</h3>
        <button 
          @click="cancelEdit"
          class="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded transition-colors"
        >
          Cancelar Edição
        </button>
      </div>
      
      <RaffleEditor 
        :raffle-data="selectedRaffle" 
        @save="saveRaffleChanges" 
      />
    </div>
    
    <!-- Formulário de novo sorteio -->
    <div v-else-if="showNewRaffleForm && selectedRaffle">
      <div class="mb-4 flex justify-between items-center">
        <h3 class="text-xl font-semibold">Novo Sorteio</h3>
        <button 
          @click="cancelEdit"
          class="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded transition-colors"
        >
          Cancelar
        </button>
      </div>
      
      <RaffleEditor 
        :raffle-data="selectedRaffle" 
        @save="saveRaffleChanges" 
      />
    </div>
    
    <!-- Lista de sorteios -->
    <div v-else>
      <!-- Informação sobre sorteio ativo -->
      <div v-if="hasActiveRaffle" class="mb-6">
        <Card class="border-l-4 border-green-500">
          <div class="p-4">
            <div class="flex items-center mb-2">
              <div class="bg-green-100 p-1 rounded-full mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-green-800">Sorteio Ativo</h3>
            </div>
            <p class="text-gray-700">
              <strong>{{ activeRaffle?.title }}</strong> está definido como o sorteio ativo atual.
            </p>
          </div>
        </Card>
      </div>
      
      <!-- Ações -->
      <div class="mb-6 flex justify-between items-center">
        <div>
          <h3 class="text-lg font-semibold">Lista de Sorteios</h3>
        </div>
        <div>
          <button 
            v-if="canCreateRaffles"
            @click="createNewRaffle"
            class="bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded transition-colors"
          >
            Criar Novo Sorteio
          </button>
          <div v-else-if="isAffiliated" class="text-sm text-yellow-600">
            Você está em um grupo de afiliação e não pode criar sorteios próprios.
          </div>
        </div>
      </div>
      
      <!-- Cards dos sorteios -->
      <div v-if="raffles.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card v-for="raffle in raffles" :key="raffle.id" :class="{ 'border-l-4 border-green-500': raffle.isActive }">
          <div class="p-4">
            <div class="flex justify-between items-start mb-4">
              <h3 class="text-lg font-semibold">{{ raffle.title }}</h3>
              <span 
                :class="[
                  'px-2 py-1 text-xs font-semibold rounded-full',
                  raffle.isCompleted 
                    ? 'bg-blue-100 text-blue-800' 
                    : raffle.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                ]"
              >
                {{ 
                  raffle.isCompleted 
                    ? 'Concluído' 
                    : raffle.isActive 
                      ? 'Ativo' 
                      : 'Inativo' 
                }}
              </span>
            </div>
            
            <div class="mb-4">
              <p class="text-sm text-gray-600">
                <span class="font-semibold">Data do sorteio:</span> {{ formatDate(raffle.raffleDate) }}
              </p>
              <p class="text-sm text-gray-600">
                <span class="font-semibold">Preço do número:</span> R$ {{ raffle.price.toFixed(2).replace('.', ',') }}
              </p>
            </div>
            
            <div class="grid grid-cols-3 gap-2 w-full">
              <button 
                @click="editRaffle(raffle.id)"
                class="bg-gray-900 hover:bg-black text-white py-1 px-3 rounded text-sm transition-colors flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Editar
              </button>
              
              <!-- Slot 2: Ativar / Pausar / Retomar -->
              <button 
                v-if="!raffle.isActive && !raffle.isPaused"
                @click="activateRaffle(raffle.id)"
                class="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded text-sm transition-colors flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ativar
              </button>
              <button 
                v-else-if="raffle.isActive && !raffle.isPaused"
                @click="confirmPauseRaffle(raffle.id)"
                class="bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded text-sm transition-colors flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Pausar
              </button>
              <button 
                v-else-if="raffle.isPaused"
                @click="resumeRaffleAction(raffle.id)"
                class="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm transition-colors flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Retomar
              </button>
              
              <!-- Slot 3: Excluir / Cancelar / Bloqueado -->
              <button 
                v-if="!raffle.isActive && !raffle.isCompleted"
                @click="confirmDelete(raffle.id)"
                class="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm transition-colors flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Excluir
              </button>
              <button 
                v-else-if="raffle.isActive"
                @click="confirmCancelRaffle(raffle.id)"
                class="bg-orange-500 hover:bg-orange-600 text-white py-1 px-3 rounded text-sm transition-colors flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </button>
              <button 
                v-else-if="raffle.isCompleted" 
                class="bg-gray-200 text-gray-400 py-1 px-3 rounded text-sm flex items-center justify-center cursor-not-allowed"
                disabled
              >
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                 </svg>
                 Bloqueado
              </button>
            </div>
          </div>
        </Card>
      </div>
      
      <!-- Mensagem quando não há sorteios -->
      <div v-else class="bg-gray-50 rounded-lg p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 class="text-lg font-medium text-gray-600 mb-1">Nenhum sorteio encontrado</h3>
        <p class="text-gray-500 mb-4">Nenhum sorteio foi cadastrado até o momento.</p>
        <button 
          @click="createNewRaffle"
          class="bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded transition-colors"
        >
          Criar Novo Sorteio
        </button>
      </div>
    </div>
    
    <!-- Modal de confirmação de exclusão -->
    <Modal 
      :show="showDeleteModal"
      title="Confirmar exclusão"
      @close="cancelDelete"
      variant="danger" 
      :hideFooter="true"  
    >
      <div class="p-4">
        <p class="text-gray-700 mb-4">
          Tem certeza que deseja excluir este sorteio? Esta ação não pode ser desfeita.
        </p>
        
        <!-- Mensagem de erro (só aparece se houver erro) -->
        <div v-if="deleteError" class="mb-4 p-2 border border-red-300 bg-red-50 rounded-md text-danger text-sm">
          <p>{{ deleteError }}</p>
          <p class="text-xs mt-1">Se o erro persistir, tente novamente mais tarde ou contate o suporte.</p>
        </div>
        
        <!-- Botões personalizados dentro do conteúdo -->
        <div class="flex justify-end space-x-3 mt-6">
          <button 
            @click="cancelDelete" 
            class="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded transition-colors"
            :disabled="isDeleting"
          >
            Cancelar
          </button>
          <button 
            @click="executeDelete" 
            class="bg-danger hover:bg-red-700 text-white py-2 px-4 rounded transition-colors flex items-center"
            :disabled="isDeleting"
          >
            <svg v-if="isDeleting" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isDeleting ? 'Excluindo...' : 'Confirmar Exclusão' }}
          </button>
        </div>
      </div>
    </Modal>
    
    <!-- Modal para confirmar cancelamento de sorteio -->
    <Modal
      :show="showCancelModal"
      title="Confirmar cancelamento do sorteio"
      @close="closeCancelModal"
      :hideFooter="true"
    >
      <div class="p-4">
        <p class="text-gray-700 mb-4">
          Tem certeza que deseja cancelar este sorteio? Esta ação não pode ser desfeita.
        </p>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Motivo do cancelamento
          </label>
          <textarea
            v-model="cancelReason"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="Informe o motivo do cancelamento..."
          ></textarea>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="closeCancelModal"
            class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition-colors"
            :disabled="processingAction"
          >
            Cancelar
          </button>
          <button 
            @click="executeCancelRaffle"
            class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors flex items-center justify-center"
            :disabled="processingAction"
          >
            <svg v-if="processingAction" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Confirmar Cancelamento
          </button>
        </div>
      </div>
    </Modal>
    
    <!-- Modal para confirmar pausa de sorteio -->
    <Modal
      :show="showPauseModal"
      title="Pausar sorteio"
      @close="closePauseModal"
      :hideFooter="true"
    >
      <div class="p-4">
        <p class="text-gray-700 mb-4">
          Esta ação irá pausar temporariamente o sorteio atual. As vendas serão suspensas até que o sorteio seja retomado.
        </p>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Motivo da pausa
          </label>
          <textarea
            v-model="pauseReason"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="Informe o motivo da pausa..."
          ></textarea>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="closePauseModal"
            class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition-colors"
            :disabled="processingAction"
          >
            Cancelar
          </button>
          <button 
            @click="executePauseRaffle"
            class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded transition-colors flex items-center justify-center"
            :disabled="processingAction"
          >
            <svg v-if="processingAction" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Confirmar Pausa
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>
