<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../stores/authStore';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const isLoading = ref(true);

// Verifica permissões de administrador ao montar o componente
onMounted(async () => {
  try {
    if (!authStore.currentUser) {
      await authStore.fetchUserData();
    }
    
    // Verificação adicional de segurança no componente
    if (!authStore.isAdmin) {
      router.push({ name: 'home' });
    }
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="container mx-auto py-8">
    <h1 class="text-3xl font-bold mb-8 text-center">Painel Administrativo</h1>
    
    <div v-if="isLoading" class="text-center py-8">
      <p>Carregando informações administrativas...</p>
    </div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Gerenciamento de Usuários -->
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-semibold mb-4 text-primary">Gerenciamento de Usuários</h2>
        <p class="text-gray-600 mb-4">Gerencie os usuários da plataforma e suas permissões.</p>
        
        <button 
          class="bg-primary hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          Ver Usuários
        </button>
      </div>
      
      <!-- Relatórios de Vendas -->
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-semibold mb-4 text-primary">Relatórios de Vendas</h2>
        <p class="text-gray-600 mb-4">Visualize estatísticas de vendas e números sorteados.</p>
        
        <button 
          class="bg-primary hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          Ver Relatórios
        </button>
      </div>
      
      <!-- Gerenciamento de Sorteios -->
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-semibold mb-4 text-primary">Gerenciar Sorteios</h2>
        <p class="text-gray-600 mb-4">Configure datas e parâmetros dos sorteios ativos.</p>
        
        <button 
          class="bg-primary hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          Configurar Sorteio
        </button>
      </div>
      
      <!-- Configurações do Sistema -->
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-semibold mb-4 text-primary">Configurações</h2>
        <p class="text-gray-600 mb-4">Configurações gerais do sistema e da plataforma.</p>
        
        <button 
          class="bg-primary hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          Acessar Configurações
        </button>
      </div>
    </div>
  </div>
</template>
