<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../stores/authStore';
import { useOrderStore } from '../../stores/orderStore';
import { formatUserRole } from '../../utils/formatters';
import ProfileEdit from '../../components/profile/ProfileEdit.vue';
import AffiliateLink from '../../components/profile/AffiliateLink.vue';
import SalesAccordion from '../../components/profile/SalesAccordion.vue';

const authStore = useAuthStore();
const orderStore = useOrderStore();
const isLoading = ref(true);
const activeTab = ref('sales'); // Inicia com a tab de vendas ativa

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
            <!-- 1. Minhas Vendas (primeiro) -->
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
            
            <!-- 2. Programa de Afiliados (segundo) -->
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
            
            <!-- 3. Informações do Perfil (terceiro) -->
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
      </div>
    </div>
  </div>
</template>
