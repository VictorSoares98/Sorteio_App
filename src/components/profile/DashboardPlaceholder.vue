<script setup lang="ts">
import Card from '../ui/Card.vue';
import { useAuthStore } from '../../stores/authStore';
import { computed } from 'vue';
import { formatUserRole } from '../../utils/formatters';
import ResetSalesButton from '../admin/ResetSalesButton.vue';

const authStore = useAuthStore();

// Função para pluralizar corretamente os nomes dos papéis em português
const pluralizedRole = computed(() => {
  if (!authStore.currentUser?.role) return 'Usuários';
  
  const roleName = formatUserRole(authStore.currentUser.role);
  
  // Regras de pluralização em português
  if (roleName.endsWith('r')) {
    // Administrador → Administradores
    return roleName.replace(/r$/, 'res');
  } else if (roleName === 'Secretaria') {
    return 'Secretárias';
  } else {
    // Caso padrão: adiciona 's'
    return roleName + 's';
  }
});
</script>

<template>
  <Card title="Painel de Controle">
    <div class="p-6">
      <div class="text-center mb-6">
        <h2 class="text-xl font-bold text-primary mb-2">Bem-vindo ao Painel de Controle</h2>
        <p class="text-gray-600">
          Esta área fornece ferramentas e informações especiais para 
          {{ pluralizedRole }}.
        </p>
      </div>
      
      <!-- Placeholder para o conteúdo futuro -->
      <div class="bg-gray-50 border border-gray-200 p-6 rounded-lg text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-primary opacity-50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 class="text-lg font-medium text-gray-800 mb-2">Conteúdo em Desenvolvimento</h3>
        <p class="text-gray-600">
          O Painel de Controle está sendo preparado com recursos avançados para ajudar na sua gestão.
          Novas funcionalidades serão disponibilizadas em breve!
        </p>
      </div>

      <!-- Ações Administrativas -->
      <div class="mt-8">
        <h3 class="text-lg font-medium text-primary mb-4">Ações Administrativas</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-medium text-gray-800 mb-2">Acesso Rápido</h4>
            <router-link 
              to="/admin" 
              class="text-primary hover:underline block mb-2"
            >
              Painel Administrativo Completo
            </router-link>
          </div>
          
          <div class="bg-red-50 p-4 rounded-lg shadow-sm border border-red-200">
            <h4 class="font-medium text-red-800 mb-2 flex items-center">
              ⚠️ Ações Destrutivas
            </h4>
            <ResetSalesButton variant="danger" block />
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
