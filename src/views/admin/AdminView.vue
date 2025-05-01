<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../stores/authStore';
import { useRouter } from 'vue-router';
import UsersList from '../../components/admin/UsersList.vue';
import SalesReportDashboard from '../../components/reports/SalesReportDashboard.vue';
import RaffleManagement from '../../components/admin/RaffleManagement.vue';
import NumberSystemMaintenance from '../../components/admin/NumberSystemMaintenance.vue';

const authStore = useAuthStore();
const router = useRouter();
const isLoading = ref(true);
const activeSection = ref<string | null>(null);

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

// Navega entre as seções do painel
const showSection = (section: string) => {
  activeSection.value = activeSection.value === section ? null : section;
};
</script>

<template>
  <div class="container mx-auto py-8">
    <h1 class="text-3xl font-bold mb-8 text-center">Painel Administrativo</h1>
    
    <div v-if="isLoading" class="text-center py-8">
      <p>Carregando informações administrativas...</p>
    </div>
    
    <div v-else>
      <!-- Mostra o componente de gerenciamento de usuários quando selecionado -->
      <div v-if="activeSection === 'users'">
        <div class="mb-4">
          <button 
            @click="showSection('menu')" 
            class="flex items-center text-primary hover:text-primary-dark"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
            </svg>
            Voltar ao Menu
          </button>
        </div>
        <UsersList />
      </div>
      
      <!-- Visualização de relatório de vendas -->
      <div v-else-if="activeSection === 'reports'">
        <div class="mb-4">
          <button 
            @click="showSection('menu')" 
            class="flex items-center text-primary hover:text-primary-dark"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
            </svg>
            Voltar ao Menu
          </button>
        </div>
        <SalesReportDashboard />
      </div>
      
      <!-- Gerenciamento de sorteios -->
      <div v-else-if="activeSection === 'raffles'">
        <div class="mb-4">
          <button 
            @click="showSection('menu')" 
            class="flex items-center text-primary hover:text-primary-dark"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
            </svg>
            Voltar ao Menu
          </button>
        </div>
        <RaffleManagement />
      </div>
      
      <!-- Configurações do Sistema -->
      <div v-else-if="activeSection === 'settings'">
        <div class="mb-4">
          <button 
            @click="showSection('menu')" 
            class="flex items-center text-primary hover:text-primary-dark"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
            </svg>
            Voltar ao Menu
          </button>
        </div>
        <NumberSystemMaintenance />
      </div>
      
      <!-- Menu principal do painel administrativo -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Gerenciamento de Usuários -->
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h2 class="text-xl font-semibold mb-4 text-primary">Gerenciamento de Usuários</h2>
          <p class="text-gray-600 mb-4">Gerencie os usuários da plataforma e suas permissões.</p>
          
          <button 
            @click="showSection('users')"
            class="bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded transition-colors"
          >
            Ver Usuários
          </button>
        </div>
        
        <!-- Relatórios de Vendas -->
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h2 class="text-xl font-semibold mb-4 text-primary">Relatórios de Vendas</h2>
          <p class="text-gray-600 mb-4">Visualize estatísticas de vendas e números sorteados.</p>
          
          <button 
            @click="showSection('reports')"
            class="bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded transition-colors"
          >
            Ver Relatórios
          </button>
        </div>
                
        <!-- Gerenciamento de Sorteios -->
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h2 class="text-xl font-semibold mb-4 text-primary">Gerenciar Sorteios</h2>
          <p class="text-gray-600 mb-4">Configure datas e parâmetros dos sorteios ativos.</p>
          
          <button 
            @click="showSection('raffles')"
            class="bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded transition-colors"
          >
            Configurar Sorteio
          </button>
        </div>

        <!-- Configurações do Sistema -->
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h2 class="text-xl font-semibold mb-4 text-primary">Configurações</h2>
          <p class="text-gray-600 mb-4">Configurações gerais do sistema e da plataforma.</p>
          
          <button 
            @click="showSection('settings')"
            class="bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded transition-colors"
          >
            Acessar Configurações
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
