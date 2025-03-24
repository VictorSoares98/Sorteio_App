<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../../stores/authStore';
import { useOrderStore } from '../../stores/orderStore';
import { formatUserRole } from '../../utils/formatters';
import { UserRole } from '../../types/user';
import ProfileEdit from '../../components/profile/ProfileEdit.vue';
import AffiliateLink from '../../components/profile/AffiliateLink.vue';
import SalesAccordion from '../../components/profile/SalesAccordion.vue';
import DashboardPlaceholder from '../../components/profile/DashboardPlaceholder.vue';
import RankingPlaceholder from '../../components/profile/RankingPlaceholder.vue';

const authStore = useAuthStore();
const orderStore = useOrderStore();
const isLoading = ref(true);
const activeTab = ref('sales'); // Inicia com a tab de vendas ativa

// Verificar se o usuário tem permissão para ver o Painel de Controle
const showDashboard = computed(() => {
  if (!authStore.currentUser) return false;
  return [UserRole.ADMIN, UserRole.TESOUREIRO, UserRole.SECRETARIA].includes(authStore.currentUser.role);
});

// Verificar se o usuário é afiliado a alguém para mostrar Ranking
const showRanking = computed(() => {
  if (!authStore.currentUser) return false;
  return !!authStore.currentUser.affiliatedTo;
});

// Garantir que os dados do usuário e pedidos estejam carregados
onMounted(async () => {
  console.log('[ProfileView] Montando componente');
  try {
    if (!authStore.currentUser) {
      console.log('[ProfileView] Usuário não encontrado, buscando dados');
      await authStore.fetchUserData();
    }
    
    // Carregar os pedidos do usuário
    console.log('[ProfileView] Buscando pedidos do usuário');
    await orderStore.fetchUserOrders();
    console.log(`[ProfileView] ${orderStore.userOrders.length} pedidos carregados`);
  } catch (error) {
    console.error('[ProfileView] Erro ao carregar dados:', error);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="container mx-auto py-8">
    <h1 class="text-3xl font-bold mb-8 text-center">Meu Perfil</h1>
    
    <div v-if="isLoading || authStore.loading" class="text-center py-8">
      <p>Carregando informações do perfil...</p>
    </div>
    
    <div v-else-if="authStore.currentUser" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Navegação lateral -->
      <div class="md:col-span-1">
        <div class="bg-white p-6 rounded-lg shadow-md">
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
              @click="activeTab = 'sales'" 
              class="py-2 px-4 rounded-md text-left transition-colors"
              :class="activeTab === 'sales' 
                ? 'bg-primary bg-opacity-10 text-white font-medium' 
                : 'hover:bg-gray-100 text-gray-700'"
            >
              <span class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Minhas Vendas
              </span>
            </button>
            
            <!-- 2. Painel de Controle (novo - apenas para admin/secretária/tesoureiro) -->
            <button 
              v-if="showDashboard"
              @click="activeTab = 'dashboard'" 
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
            
            <!-- 3. Ranking (novo - apenas para afiliados) -->
            <button 
              v-if="showRanking"
              @click="activeTab = 'ranking'" 
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
              @click="activeTab = 'affiliate'" 
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
              @click="activeTab = 'profile'" 
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
        
        <!-- Link de Afiliado -->
        <div v-else-if="activeTab === 'affiliate'">
          <AffiliateLink />
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
  </div>
</template>
