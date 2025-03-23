<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../stores/authStore';
import { useOrderStore } from '../../stores/orderStore';
import ProfileEdit from '../../components/profile/ProfileEdit.vue';
import AffiliateLink from '../../components/profile/AffiliateLink.vue';
import SoldNumbersList from '../../components/profile/SoldNumbersList.vue';

const authStore = useAuthStore();
const orderStore = useOrderStore();
const isLoading = ref(true);
const activeTab = ref('profile'); // 'profile', 'sales', 'affiliate'

// Carregar pedidos do usuário quando o componente for montado
onMounted(async () => {
  try {
    if (!authStore.currentUser) {
      await authStore.fetchUserData();
    }
    
    await orderStore.fetchUserOrders();
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
      <!-- Informações do usuário -->
      <div class="md:col-span-1">
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h2 class="text-xl font-semibold mb-4 text-primary">Dados Pessoais</h2>
          
          <div class="space-y-4">
            <div>
              <p class="text-sm text-gray-500">Nome</p>
              <p class="font-medium">{{ authStore.currentUser.displayName }}</p>
            </div>
            
            <div>
              <p class="text-sm text-gray-500">Email</p>
              <p class="font-medium">{{ authStore.currentUser.email }}</p>
            </div>
            
            <div v-if="authStore.currentUser.congregation">
              <p class="text-sm text-gray-500">Congregação</p>
              <p class="font-medium">{{ authStore.currentUser.congregation }}</p>
            </div>
            
            <div>
              <p class="text-sm text-gray-500">Tipo de Conta</p>
              <p class="font-medium capitalize">{{ authStore.currentUser.role }}</p>
            </div>
          </div>
          
          <!-- Tabs para navegar entre as diferentes seções -->
          <div class="mt-6 flex border-b">
            <button 
              @click="activeTab = 'profile'" 
              class="px-4 py-2 border-b-2 focus:outline-none"
              :class="activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent'"
            >
              Editar Perfil
            </button>
            <button 
              @click="activeTab = 'sales'" 
              class="px-4 py-2 border-b-2 focus:outline-none"
              :class="activeTab === 'sales' ? 'border-primary text-primary' : 'border-transparent'"
            >
              Vendas
            </button>
            <button 
              @click="activeTab = 'affiliate'" 
              class="px-4 py-2 border-b-2 focus:outline-none"
              :class="activeTab === 'affiliate' ? 'border-primary text-primary' : 'border-transparent'"
            >
              Afiliado
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
        
        <!-- Números Vendidos -->
        <div v-else-if="activeTab === 'sales'">
          <SoldNumbersList />
        </div>
        
        <!-- Link de Afiliado -->
        <div v-else-if="activeTab === 'affiliate'">
          <AffiliateLink />
        </div>
      </div>
    </div>
  </div>
</template>
