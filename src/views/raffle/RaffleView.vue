<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent, watch } from 'vue';
import { useAuthStore } from '../../stores/authStore';
import { useRoute, useRouter } from 'vue-router';
import Alert from '../../components/ui/Alert.vue';
// Importação condicional para melhorar desempenho
import RaffleDisplay from '../../components/raffle/RaffleDisplay.vue';
import { UserRole } from '../../types/user';
import { fetchRaffleData, fetchRaffleById, fetchAllRaffles, setActiveRaffle, type RaffleData } from '../../services/raffle';
import { createDefaultRaffle } from '../../utils/raffleFactory';

// Importação condicional do editor apenas quando necessário (para administradores)
const RaffleEditor = defineAsyncComponent(() => 
  import('../../components/raffle/RaffleEditor.vue')
);

// Componente de lista de sorteios quando houver múltiplos
const RaffleList = defineAsyncComponent(() => 
  import('../../components/admin/RaffleList.vue')
);

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const raffleData = ref<RaffleData | null>(null);
const allRaffles = ref<RaffleData[]>([]);
const showRaffleList = ref(false);

// Verificar se o usuário tem acesso administrativo
const isAdmin = computed(() => {
  return authStore.currentUser?.role === UserRole.ADMIN ||
         authStore.currentUser?.role === UserRole.SECRETARIA ||
         authStore.currentUser?.role === UserRole.TESOUREIRO;
});

// Obter o raffleId da rota, se houver
const raffleId = computed(() => route.params.id as string | undefined);

// Estado para controle de edição
const isEditing = ref(false);

const toggleEdit = () => {
  isEditing.value = !isEditing.value;
};

// Função específica para cancelar edição com tratamento especial para novos sorteios
const cancelEdit = () => {
  // Verificar se estamos cancelando a criação de um novo sorteio (ID vazio)
  if (raffleData.value && raffleData.value.id === '') {
    // Cancelando um novo sorteio, resetar para null para mostrar "nenhum sorteio encontrado"
    raffleData.value = null;
  }
  // Desativar o modo de edição
  isEditing.value = false;
};

// Alternar entre exibição de sorteio e lista
const toggleRaffleList = () => {
  showRaffleList.value = !showRaffleList.value;
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
    let data: RaffleData | null = null;

    // Se tiver um ID na rota, buscar esse sorteio específico
    if (raffleId.value) {
      data = await fetchRaffleById(raffleId.value);
      
      if (!data) {
        // Não é um erro, apenas não há esse sorteio específico
        router.push('/sorteio'); // Redirecionar para a página principal de sorteio
        return;
      }
    } else {
      // Sem ID, buscar o sorteio ativo ou qualquer sorteio disponível
      try {
        data = await fetchRaffleData();
        // Não tratar a ausência de sorteios como erro
      } catch (err) {
        // Apenas falhas reais de API/conexão devem ser tratadas como erro
        error.value = handleFetchError(err);
        loading.value = false;
        return;
      }
    }
    
    if (data) {
      raffleData.value = data;
    } else {
      // Quando não há sorteios, definir como null em vez de criar um padrão
      // para que a UI mostre a mensagem "nenhum sorteio encontrado"
      raffleData.value = null;
    }

    // Carregar todos os sorteios disponíveis para a lista (apenas se for admin)
    if (isAdmin.value) {
      await loadAllRaffles();
    }
  } catch (err) {
    console.error('Erro inesperado ao buscar dados do sorteio:', err);
    error.value = handleFetchError(err);
  } finally {
    loading.value = false;
  }
};

// Carregar todos os sorteios disponíveis
const loadAllRaffles = async () => {
  try {
    allRaffles.value = await fetchAllRaffles();
  } catch (err) {
    console.error('Erro ao carregar lista de sorteios:', err);
  }
};

// Navegar para um sorteio específico
const navigateToRaffle = (id: string) => {
  router.push(`/sorteio/${id}`);
  showRaffleList.value = false;
};

// Definir um sorteio como ativo
const activateRaffle = async (id: string) => {
  try {
    loading.value = true;
    await setActiveRaffle(id);
    
    successMessage.value = 'Sorteio definido como ativo com sucesso!';
    setTimeout(() => {
      successMessage.value = null;
    }, 3000);
    
    // Recarregar a lista e dados do sorteio
    await loadAllRaffles();
    
    if (id === raffleData.value?.id) {
      // Se o sorteio atual foi ativado, recarregar seus dados
      const updatedRaffle = await fetchRaffleById(id);
      if (updatedRaffle) {
        raffleData.value = updatedRaffle;
      }
    }
  } catch (err) {
    error.value = 'Não foi possível ativar o sorteio';
  } finally {
    loading.value = false;
  }
};

// Salvar alterações no sorteio no Firestore
const saveRaffleChanges = async (updatedData: RaffleData) => {
  try {
    loading.value = true;
    error.value = null;
    
    // Verificar formato do horário antes de salvar (segurança adicional)
    if (updatedData.raffleTime) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(updatedData.raffleTime)) {
        console.warn(`[RaffleView] Formato de horário inválido ao salvar: ${updatedData.raffleTime}, corrigindo.`);
        updatedData.raffleTime = '12:00'; // Valor padrão seguro
      } else {
        console.log(`[RaffleView] Salvando horário: ${updatedData.raffleTime}`);
      }
    }
    
    // Importar o serviço dinamicamente para reduzir o tamanho do bundle
    const { saveRaffleData } = await import('../../services/raffle');
    
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

// Criar um novo sorteio
const createNewRaffle = () => {
  raffleData.value = createDefaultRaffle();
  // Set the current user as creator if authenticated
  if (authStore.currentUser?.id) {
    raffleData.value.createdBy = authStore.currentUser.id;
  }
  isEditing.value = true;
};

// Observar mudanças na rota para recarregar dados quando o ID mudar
watch(() => route.params.id, () => {
  fetchRaffleDataFromFirestore();
});

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
      <div v-if="isAdmin" class="mb-6 flex flex-wrap justify-end gap-2">
        <button 
          @click="toggleRaffleList" 
          class="bg-gray-900 hover:bg-black text-white py-2 px-4 rounded transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          {{ showRaffleList ? 'Fechar Lista' : 'Ver Todos Sorteios' }}
        </button>

        <button 
          v-if="!isEditing && !showRaffleList" 
          @click="toggleEdit" 
          class="bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar Informações
        </button>
        
        <button 
          v-else-if="isEditing" 
          @click="cancelEdit" 
          class="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors flex items-center mr-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancelar Edição
        </button>
        
        <button 
          v-if="!raffleData.isActive && !showRaffleList && !isEditing"
          @click="activateRaffle(raffleData.id)"
          class="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Definir como Ativo
        </button>
      </div>
      
      <!-- Lista de todos os sorteios (para administradores) -->
      <RaffleList 
        v-if="showRaffleList && isAdmin" 
        :raffles="allRaffles"
        :current-raffle-id="raffleData?.id"
        @navigate="navigateToRaffle"
        @activate="activateRaffle"
        class="mb-8"
      />
      
      <!-- Modo de edição para administradores -->
      <RaffleEditor 
        v-if="isAdmin && isEditing" 
        :raffle-data="raffleData" 
        @save="saveRaffleChanges" 
      />
      
      <!-- Exibição normal para todos os usuários -->
      <RaffleDisplay v-else-if="compatibleRaffleData && !showRaffleList" :raffle-data="compatibleRaffleData" />
      
      <!-- Fallback caso compatibleRaffleData seja null (improvável, mas para garantir tipagem correta) -->
      <div v-else-if="!showRaffleList" class="text-center py-8 bg-gray-50 rounded-lg shadow-sm">
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
      
      <div v-if="isAdmin" class="mt-6">
        <button 
          @click="createNewRaffle"
          class="bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded transition-colors"
        >
          Criar Novo Sorteio
        </button>
      </div>
    </div>
  </div>
</template>
