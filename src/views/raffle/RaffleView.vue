<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from 'vue';
import { useAuthStore } from '../../stores/authStore';
import Alert from '../../components/ui/Alert.vue';
// Importação condicional para melhorar desempenho
import RaffleDisplay from '../../components/raffle/RaffleDisplay.vue';
import { UserRole } from '../../types/user';
import { fetchRaffleData, saveRaffleData, type RaffleData } from '../../services/raffle';
import { createDefaultRaffle } from '../../utils/raffleFactory';

// Importação condicional do editor apenas quando necessário (para administradores)
const RaffleEditor = defineAsyncComponent(() => 
  import('../../components/raffle/RaffleEditor.vue')
);

const authStore = useAuthStore();
const loading = ref(true);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const raffleData = ref<RaffleData | null>(null);

// Verificar se o usuário tem acesso administrativo
const isAdmin = computed(() => {
  return authStore.currentUser?.role === UserRole.ADMIN ||
         authStore.currentUser?.role === UserRole.SECRETARIA ||
         authStore.currentUser?.role === UserRole.TESOUREIRO;
});

// Estado para controle de edição
const isEditing = ref(false);

const toggleEdit = () => {
  isEditing.value = !isEditing.value;
};

// Computed property to ensure type compatibility with RaffleDisplay component
const compatibleRaffleData = computed(() => {
  if (!raffleData.value) return null;
  return {
    ...raffleData.value,
    // Make sure winningNumber is the correct type
    winningNumber: raffleData.value.winningNumber || undefined
  };
});

// Função específica para verificar erros durante o carregamento dos dados
const handleFetchError = (error: unknown): string => {
  console.error('Erro ao carregar dados do sorteio:', error);
  return 'Não foi possível carregar as informações do sorteio. Tente novamente mais tarde.';
};

// Carregar dados do sorteio do Firestore
const fetchRaffleDataFromFirestore = async () => {
  loading.value = true;
  error.value = null;
  successMessage.value = null;
  
  try {
    const data = await fetchRaffleData();
    
    if (data) {
      raffleData.value = data;
    } else {
      // Usando o factory para criar o modelo padrão
      raffleData.value = createDefaultRaffle();
      
      // Se for admin, salvar esse modelo padrão no Firestore
      if (isAdmin.value) {
        await saveRaffleData(raffleData.value);
      }
    }
  } catch (err) {
    error.value = handleFetchError(err);
  } finally {
    loading.value = false;
  }
};

// Salvar alterações no sorteio no Firestore
const saveRaffleChanges = async (updatedData: RaffleData) => {
  try {
    loading.value = true;
    error.value = null;
    
    // Salvar no Firestore
    await saveRaffleData(updatedData);
    
    // Atualizar dados locais
    raffleData.value = { ...updatedData };
    
    // Fechar modo de edição
    isEditing.value = false;
    
    // Mostrar mensagem de sucesso
    successMessage.value = 'Informações do sorteio atualizadas com sucesso!';
    
    // Esconder a mensagem após 5 segundos
    setTimeout(() => {
      successMessage.value = null;
    }, 5000);
  } catch (err) {
    console.error('Erro ao salvar alterações do sorteio:', err);
    error.value = 'Não foi possível salvar as alterações. Tente novamente.';
  } finally {
    loading.value = false;
  }
};

// Carregar dados ao montar o componente
onMounted(() => {
  fetchRaffleDataFromFirestore();
});
</script>

<template>
  <div class="container mx-auto py-8 px-4">
    <h1 class="text-3xl font-bold mb-6 text-center text-primary">Sorteio Tá nas Mãos de Deus</h1>
    
    <!-- Mensagem de sucesso -->
    <Alert v-if="successMessage" type="success" :message="successMessage" class="mb-6 max-w-4xl mx-auto" />
    
    <!-- Estado de carregamento -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      <span class="ml-3 text-gray-600">Carregando informações do sorteio...</span>
    </div>
    
    <!-- Mensagem de erro -->
    <Alert v-else-if="error" type="error" :message="error" class="mb-6" />
    
    <!-- Conteúdo principal -->
    <div v-else-if="raffleData" class="max-w-4xl mx-auto">
      <!-- Botões de controle para administradores -->
      <div v-if="isAdmin" class="mb-6 flex justify-end">
        <button 
          v-if="!isEditing" 
          @click="toggleEdit" 
          class="bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar Informações
        </button>
        <button 
          v-else 
          @click="toggleEdit" 
          class="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors flex items-center mr-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancelar Edição
        </button>
      </div>
      
      <!-- Modo de edição para administradores -->
      <RaffleEditor 
        v-if="isAdmin && isEditing" 
        :raffle-data="raffleData" 
        @save="saveRaffleChanges" 
      />
      
      <!-- Exibição normal para todos os usuários -->
      <RaffleDisplay v-else-if="compatibleRaffleData" :raffle-data="compatibleRaffleData" />
      
      <!-- Fallback caso compatibleRaffleData seja null (improvável, mas para garantir tipagem correta) -->
      <div v-else class="text-center py-8 bg-gray-50 rounded-lg shadow-sm">
        <p class="text-gray-500">Ocorreu um erro ao processar os dados do sorteio.</p>
      </div>
    </div>
    
    <!-- Fallback quando não há dados -->
    <div v-else class="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="text-lg font-medium text-gray-600 mb-2">Nenhum sorteio encontrado</h3>
      <p class="text-gray-500">No momento não há sorteios disponíveis.</p>
    </div>
  </div>
</template>
