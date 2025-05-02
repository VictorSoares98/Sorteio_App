<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '../../stores/authStore';
import { useOrderStore } from '../../stores/orderStore';
import { useRouter, useRoute } from 'vue-router';
import { formatUserRole } from '../../utils/formatters';
import { UserRole } from '../../types/user';
import ProfileEdit from '../../components/profile/ProfileEdit.vue';
import AffiliateLink from '../../components/profile/AffiliateLink.vue';
import SalesAccordion from '../../components/profile/SalesAccordion.vue';
import DashboardPlaceholder from '../../components/profile/DashboardPlaceholder.vue';
import RankingPlaceholder from '../../components/profile/RankingPlaceholder.vue';
import Alert from '../../components/ui/Alert.vue';
import OfflineSyncStatus from '../../components/offline/OfflineSyncStatus.vue';

const authStore = useAuthStore();
const orderStore = useOrderStore();
const router = useRouter();
const route = useRoute();
const isLoading = ref(true);
const affiliateLinkKey = ref(0); // Chave para forçar recriação do componente AffiliateLink

// Mapeamento entre rotas e identificadores das abas
const routeToTabMap = {
  'perfil-vendas': 'sales',
  'perfil-painel': 'dashboard',
  'perfil-afiliados': 'affiliate',
  'perfil-ranking': 'ranking',
  'perfil-informacoes': 'profile'
};

// Mapeamento inverso para navegação
const tabToRouteMap = {
  'sales': 'perfil-vendas',
  'dashboard': 'perfil-painel',
  'affiliate': 'perfil-afiliados',
  'ranking': 'perfil-ranking',
  'profile': 'perfil-informacoes'
};

// Propriedade computada para determinar a aba ativa com base na rota
const activeTab = computed(() => {
  return routeToTabMap[route.name as keyof typeof routeToTabMap] || 'sales';
});

// Verificar se o usuário tem permissão para ver o Painel de Controle
const showDashboard = computed(() => {
  if (!authStore.currentUser) return false;
  
  // Verificar se usuário tem papel administrativo
  const isAdmin = [UserRole.ADMIN, UserRole.TESOUREIRO, UserRole.SECRETARIA].includes(authStore.currentUser.role);
  
  // Verificar se usuário está afiliado a alguém
  const isAffiliated = !!authStore.currentUser.affiliatedTo;
  
  // Mostrar para admins OU para não-afiliados
  return isAdmin || !isAffiliated;
});

// Verificar se o usuário é afiliado a alguém OU tem papel administrativo para mostrar Ranking
const showRanking = computed(() => {
  if (!authStore.currentUser) return false;
  
  // Verifica se o usuário está afiliado a alguém
  const isAffiliated = !!authStore.currentUser.affiliatedTo;
  
  // Verifica se o usuário tem papel administrativo
  const isAdmin = [UserRole.ADMIN, UserRole.TESOUREIRO, UserRole.SECRETARIA].includes(authStore.currentUser.role);
  
  // Retorna true se qualquer uma das condições for verdadeira
  return isAffiliated || isAdmin;
});

// Função para corrigir perfil administrativo manualmente
const fixAdminRole = async () => {
  isLoading.value = true;
  try {
    // Importar a função sob demanda para não sobrecarregar a aplicação
    const { fixAdminRoles } = await import('../../services/profile');
    await fixAdminRoles();
    // Atualizar dados do usuário após a correção
    await authStore.fetchUserData(true);
    console.log('[ProfileView] Papel administrativo verificado e atualizado');
  } catch (error) {
    console.error('[ProfileView] Erro ao corrigir papel administrativo:', error);
  } finally {
    isLoading.value = false;
  }
};

// Definindo um tipo para as chaves válidas de tabToRouteMap
type TabName = keyof typeof tabToRouteMap;

// Função atualizada para usar o router para navegação
const switchTab = (tab: TabName) => {
  // If already on the same tab, no need to do anything
  if (activeTab.value === tab) {
    console.log('[ProfileView] Already on tab:', tab);
    return;
  }
  
  // If switching to affiliate tab, increment the key
  if (tab === 'affiliate') {
    affiliateLinkKey.value++;
  }
  
  // Navigate to the corresponding route
  router.push({ name: tabToRouteMap[tab] });
};

// Observar mudanças no papel do usuário
watch(() => authStore.currentUser?.role, (newRole) => {
  if (newRole) {
    console.log('[ProfileView] Papel do usuário atualizado:', newRole);
    // Forçar atualização do componente
    isLoading.value = true;
    setTimeout(() => {
      isLoading.value = false;
    }, 100);
  }
});

// Garantir que os dados do usuário e pedidos estejam carregados
onMounted(async () => {
  console.log('[ProfileView] Montando componente');
  try {
    // Forçar atualização completa dos dados do usuário
    console.log('[ProfileView] Buscando dados atualizados do usuário');
    await authStore.fetchUserData(true); // Adicionar parâmetro para forçar atualização
    
    // Carregar os pedidos do usuário
    console.log('[ProfileView] Buscando pedidos do usuário');
    await orderStore.fetchUserOrders();
    console.log(`[ProfileView] ${orderStore.userOrders.length} pedidos carregados`);
  } catch (error) {
    console.error('[ProfileView] Erro ao carregar dados:', error);
  } finally {
    isLoading.value = false;
  }

  // Verificar se o usuário tem afiliados mas não tem papel administrativo
  const user = authStore.currentUser;
  if (user && user.affiliates && user.affiliates.length > 0 && 
      user.role === UserRole.USER) {
    console.warn('[ProfileView] Detectado usuário com afiliados mas sem papel administrativo');
    try {
      await fixAdminRole();
    } catch (error) {
      console.error('[ProfileView] Falha ao corrigir papel administrativo:', error);
    }
  }
});

// Adicionar função para gerar avatar padrão com a inicial do usuário
const getDefaultAvatar = (name: string) => {
  const seed = encodeURIComponent(name || 'user');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=FF8C00`;
};
</script>

<template>
  <div class="container mx-auto py-8">
    <h1 class="text-3xl font-bold mb-8 text-center">Meu Perfil</h1>
    
    <div v-if="isLoading || authStore.loading" class="text-center py-8">
      <p>Carregando informações do perfil...</p>
    </div>
    
    <div v-else-if="authStore.currentUser" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Alerta de inconsistência de papel -->
      <div v-if="authStore.currentUser.affiliates && 
                 authStore.currentUser.affiliates.length > 0 && 
                 authStore.currentUser.role === UserRole.USER"
           class="md:col-span-3 mb-4">
        <Alert type="warning" dismissible message="Inconsistência Detectada">
          <div class="flex items-center">
            <span class="mr-2">Detectamos que você tem afiliados mas não tem acesso administrativo.</span>
            <button @click="fixAdminRole" 
                    class="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary-dark">
              Corrigir Agora
            </button>
          </div>
        </Alert>
      </div>
      
      <!-- Navegação lateral -->
      <div class="md:col-span-1">
        <div class="bg-white p-6 rounded-lg shadow-md">
          <!-- Placeholder de foto de perfil - Ajustado -->
          <div class="mb-6 flex flex-col items-center justify-center">
            <div class="w-40 h-40 rounded-full overflow-hidden border-2 border-primary shadow-md">
              <img 
                :src="authStore.currentUser?.photoURL || getDefaultAvatar(authStore.currentUser?.displayName || '')" 
                :alt="authStore.currentUser?.displayName || 'Avatar'"
                class="w-full h-full object-cover"
              />
            </div>
          </div>
          
          <!-- Nome do usuário para contexto -->
          <div class="mb-6 pb-4 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-primary mb-1">{{ authStore.currentUser.displayName }}</h2>
            <p class="text-sm text-gray-500">{{ authStore.currentUser.email }}</p>
            <!-- Adicionada exibição do tipo de conta -->
            <p class="text-xs text-gray-400 mt-1">{{ formatUserRole(authStore.currentUser.role) }}</p>
          </div>
          
          <!-- Tabs para navegar entre as diferentes seções (ordem alterada) -->
          <div class="flex flex-col space-y-2">
            <!-- 1. Minhas Vendas -->
            <button 
              @click="switchTab('sales')" 
              class="py-2 px-4 rounded-md text-left transition-colors"
              :class="activeTab === 'sales' 
                ? 'bg-primary bg-opacity-10 text-white font-medium' 
                : 'hover:bg-gray-100 text-gray-700'"
            >
              <span class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Minhas Vendas
              </span>
            </button>
            
            <!-- 2. Painel de Controle (novo - apenas para admin/secretária/tesoureiro) -->
            <button 
              v-if="showDashboard"
              @click="switchTab('dashboard')" 
              class="py-2 px-4 rounded-md text-left transition-colors"
              :class="activeTab === 'dashboard' 
                ? 'bg-primary bg-opacity-10 text-white font-medium' 
                : 'hover:bg-gray-100 text-gray-700'"
            >
              <span class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Painel de Controle
              </span>
            </button>
            
            <!-- 3. Ranking (novo - apenas para afiliados ou administradores) -->
            <button 
              v-if="showRanking"
              @click="switchTab('ranking')" 
              class="py-2 px-4 rounded-md text-left transition-colors"
              :class="activeTab === 'ranking' 
                ? 'bg-primary bg-opacity-10 text-white font-medium' 
                : 'hover:bg-gray-100 text-gray-700'"
            >
              <span class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Ranking
              </span>
            </button>
            
            <!-- 4. Programa de Afiliados -->
            <button 
              @click="switchTab('affiliate')" 
              class="py-2 px-4 rounded-md text-left transition-colors"
              :class="activeTab === 'affiliate' 
                ? 'bg-primary bg-opacity-10 text-white font-medium' 
                : 'hover:bg-gray-100 text-gray-700'"
            >
              <span class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Programa de Afiliados
              </span>
            </button>
            
            <!-- 5. Informações do Perfil -->
            <button 
              @click="switchTab('profile')" 
              class="py-2 px-4 rounded-md text-left transition-colors"
              :class="activeTab === 'profile' 
                ? 'bg-primary bg-opacity-10 text-white font-medium' 
                : 'hover:bg-gray-100 text-gray-700'"
            >
              <span class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Informações do Perfil
              </span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Conteúdo dinâmico baseado na tab ativa -->
      <div class="md:col-span-2">
        <!-- Editar Perfil -->
        <div v-if="activeTab === 'profile'">
          <ProfileEdit />
        </div>
        
        <!-- Vendas -->
        <div v-else-if="activeTab === 'sales'">
          <SalesAccordion />
        </div>
        
        <!-- Link de Afiliado - com key dinâmica para recriação do componente -->
        <div v-else-if="activeTab === 'affiliate'">
          <AffiliateLink :key="affiliateLinkKey" />
        </div>
        
        <!-- Painel de Controle (novo) -->
        <div v-else-if="activeTab === 'dashboard' && showDashboard">
          <DashboardPlaceholder />
        </div>
        
        <!-- Ranking (novo) -->
        <div v-else-if="activeTab === 'ranking' && showRanking">
          <RankingPlaceholder />
        </div>
      </div>
    </div>
    
    <!-- Adicionar componente OfflineSyncStatus em local apropriado -->
    <div class="mb-6">
      <OfflineSyncStatus />
    </div>
  </div>
</template>
