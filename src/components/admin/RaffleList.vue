<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { fetchAllRaffles, type RaffleData } from '../../services/raffle';
import { DateTime } from 'luxon';
import Card from '../ui/Card.vue';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types/user';

const router = useRouter();
const authStore = useAuthStore();
const raffles = ref<RaffleData[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const searchQuery = ref('');

// Verificar se o usuário é administrador
const isAdmin = computed(() => {
  if (!authStore.currentUser) return false;
  return [UserRole.ADMIN, UserRole.SECRETARIA, UserRole.TESOUREIRO].includes(authStore.currentUser.role);
});

// Verificar se o usuário tem afiliações (é afiliado ou tem afiliados)
const hasAffiliations = computed(() => {
  if (!authStore.currentUser) return false;
  return (
    !!authStore.currentUser.affiliatedTo || 
    (authStore.currentUser.affiliates && authStore.currentUser.affiliates.length > 0)
  );
});

// Buscar todos os sorteios ao montar o componente
onMounted(async () => {
  await loadRaffles();
});

// Função para carregar todos os sorteios com as restrições de visibilidade
const loadRaffles = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    // Obter todos os sorteios do banco de dados
    const allRaffles = await fetchAllRaffles();
    
    // Filtrar os sorteios com base nas permissões e visibilidade configurada
    if (!authStore.currentUser) {
      // Usuários não autenticados só veem sorteios universais e ativos
      raffles.value = allRaffles.filter(raffle => 
        raffle.isActive || raffle.visibility === 'universal'
      );
      return;
    }

    // Para usuários autenticados, aplicar regras de visibilidade
    raffles.value = allRaffles.filter(raffle => {
      // O criador sempre vê seu próprio sorteio
      if (raffle.createdBy === authStore.currentUser?.id) return true;
      
      // Sorteios ativos são sempre visíveis
      if (raffle.isActive) return true;
      
      // Aplicar regras baseadas na configuração de visibilidade
      switch (raffle.visibility) {
        case 'universal':
          // Modificação: Usuários comuns só veem sorteios universais se forem ativos
          if (!hasAffiliations.value && !isAdmin.value && raffle.createdBy !== authStore.currentUser?.id) {
            return raffle.isActive;
          }
          return true;
          
        case 'private':
          return raffle.createdBy === authStore.currentUser?.id; // Apenas o criador
          
        case 'affiliates':
          // Verificar se faz parte da rede de afiliação
          if (!authStore.currentUser) return false;
          return (
            // Criador vê
            raffle.createdBy === authStore.currentUser.id ||
            // Afiliador vê sorteios de seus afiliados
            (authStore.currentUser.affiliates && 
             authStore.currentUser.affiliates.includes(raffle.createdBy)) ||
            // Afiliado vê sorteios de seu afiliador
            (authStore.currentUser.affiliatedTo === raffle.createdBy)
          );
          
        case 'admin':
          // Modificação: Administradores só veem se criaram ou têm vínculo explícito
          return isAdmin.value && (
            // Sorteio próprio
            raffle.createdBy === authStore.currentUser?.id ||
            // Vínculo via afiliação
            (authStore.currentUser?.affiliates && 
             authStore.currentUser.affiliates.includes(raffle.createdBy)) ||
            (authStore.currentUser?.affiliatedTo === raffle.createdBy)
          );
          
        default:
          // Comportamento padrão (retrocompatibilidade)
          if (isAdmin.value) {
            return authStore.currentUser && raffle.createdBy === authStore.currentUser.id;
          } else if (hasAffiliations.value) {
            // Lógica para usuários com afiliações
            // ...existing code for affiliations...
          } else {
            return raffle.isActive;
          }
      }
    });
  } catch (err) {
    console.error('[RaffleList] Erro ao carregar sorteios:', err);
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

// Ir para a página de detalhes do sorteio
const goToRaffleDetails = (raffleId: string) => {
  router.push({ path: `/sorteio/${raffleId}` });
};

// Filtragem de sorteios por texto
const filteredRaffles = computed(() => {
  if (!searchQuery.value.trim()) return raffles.value;
  
  const query = searchQuery.value.toLowerCase().trim();
  return raffles.value.filter(raffle => 
    raffle.title.toLowerCase().includes(query) || 
    raffle.description.toLowerCase().includes(query)
  );
});

// Agrupar sorteios por status
const groupedRaffles = computed(() => {
  const active = filteredRaffles.value.filter(raffle => raffle.isActive);
  const completed = filteredRaffles.value.filter(raffle => raffle.isCompleted);
  const upcoming = filteredRaffles.value.filter(raffle => !raffle.isActive && !raffle.isCompleted);
  
  return { active, completed, upcoming };
});
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold mb-6">Sorteios Disponíveis</h2>
    
    <!-- Mensagem explicativa sobre visibilidade -->
    <div class="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
      <p class="text-blue-700">
        <span class="font-bold">Nota:</span> 
        <span v-if="isAdmin">
          Você está visualizando os sorteios que criou ou gerencia, além do sorteio ativo atual.
        </span>
        <span v-else-if="hasAffiliations">
          Você está visualizando os sorteios relacionados à sua rede de afiliação.
        </span>
        <span v-else>
          Você está visualizando apenas seus sorteios e o sorteio ativo atual.
        </span>
      </p>
    </div>
    
    <!-- Barra de pesquisa -->
    <div class="mb-6">
      <div class="relative">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Buscar sorteios..." 
          class="pl-10 py-2 pr-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>
    </div>
    
    <!-- Estado de carregamento -->
    <div v-if="loading" class="flex justify-center my-8">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
    </div>
    
    <!-- Mensagem de erro -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
      <p>{{ error }}</p>
      <button 
        @click="loadRaffles" 
        class="mt-2 bg-red-100 text-red-700 py-1 px-3 rounded hover:bg-red-200 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
    
    <!-- Conteúdo -->
    <div v-else>
      <!-- Sorteio ativo -->
      <div v-if="groupedRaffles.active.length > 0" class="mb-8">
        <h3 class="text-xl font-semibold mb-4 border-b pb-2">Sorteio Ativo</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card 
            v-for="raffle in groupedRaffles.active" 
            :key="raffle.id"
            class="border-l-4 border-green-500 hover:shadow-lg transition-shadow cursor-pointer"
            @click="goToRaffleDetails(raffle.id)"
          >
            <div class="p-4">
              <div class="flex justify-between items-start mb-3">
                <h4 class="text-lg font-medium">{{ raffle.title }}</h4>
                <span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                  Ativo
                </span>
              </div>
              
              <p class="text-gray-600 text-sm mb-2 line-clamp-2">{{ raffle.description }}</p>
              
              <div class="text-sm text-gray-500 mt-3">
                <div class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{{ formatDate(raffle.raffleDate) }}</span>
                </div>
                
                <div class="flex items-center mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>R$ {{ raffle.price.toFixed(2).replace('.', ',') }}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      <!-- Sorteios futuros -->
      <div v-if="groupedRaffles.upcoming.length > 0" class="mb-8">
        <h3 class="text-xl font-semibold mb-4 border-b pb-2">Próximos Sorteios</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card 
            v-for="raffle in groupedRaffles.upcoming" 
            :key="raffle.id"
            class="hover:shadow-lg transition-shadow cursor-pointer"
            @click="goToRaffleDetails(raffle.id)"
          >
            <div class="p-4">
              <div class="flex justify-between items-start mb-3">
                <h4 class="text-lg font-medium">{{ raffle.title }}</h4>
                <span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
                  Em breve
                </span>
              </div>
              
              <p class="text-gray-600 text-sm mb-2 line-clamp-2">{{ raffle.description }}</p>
              
              <div class="text-sm text-gray-500 mt-3">
                <div class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{{ formatDate(raffle.raffleDate) }}</span>
                </div>
                
                <div class="flex items-center mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>R$ {{ raffle.price.toFixed(2).replace('.', ',') }}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      <!-- Sorteios concluídos -->
      <div v-if="groupedRaffles.completed.length > 0" class="mb-8">
        <h3 class="text-xl font-semibold mb-4 border-b pb-2">Sorteios Concluídos</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card 
            v-for="raffle in groupedRaffles.completed" 
            :key="raffle.id"
            class="border-l-4 border-blue-500 hover:shadow-lg transition-shadow cursor-pointer opacity-80"
            @click="goToRaffleDetails(raffle.id)"
          >
            <div class="p-4">
              <div class="flex justify-between items-start mb-3">
                <h4 class="text-lg font-medium">{{ raffle.title }}</h4>
                <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                  Concluído
                </span>
              </div>
              
              <div v-if="raffle.winningNumber" class="mb-3 p-2 bg-yellow-50 rounded-md border border-yellow-200">
                <p class="text-sm font-medium text-yellow-800">
                  Número sorteado: <span class="text-yellow-700 font-bold">{{ raffle.winningNumber }}</span>
                </p>
              </div>
              
              <p class="text-gray-600 text-sm mb-2 line-clamp-2">{{ raffle.description }}</p>
              
              <div class="text-sm text-gray-500 mt-3">
                <div class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{{ formatDate(raffle.raffleDate) }}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      <!-- Mensagem quando não há sorteios -->
      <div v-if="filteredRaffles.length === 0" class="bg-gray-50 rounded-lg p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 class="text-lg font-medium text-gray-600 mb-1">Nenhum sorteio encontrado</h3>
        <p class="text-gray-500">
          {{ searchQuery 
              ? 'Nenhum sorteio corresponde à sua busca.' 
              : isAdmin 
                ? 'Você não criou nenhum sorteio ainda.' 
                : 'Nenhum sorteio disponível para você no momento.' 
          }}
        </p>
      </div>
    </div>
  </div>
</template>
