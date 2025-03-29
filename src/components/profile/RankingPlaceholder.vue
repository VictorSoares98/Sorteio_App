<script setup lang="ts">
import { computed } from 'vue';
import Card from '../ui/Card.vue';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types/user';

const authStore = useAuthStore();

// Melhorado para garantir que todos os cenários são tratados corretamente
const affiliatorInfo = computed(() => {
  const currentUser = authStore.currentUser;
  
  if (!currentUser) {
    return { name: '', email: '', congregation: '' };
  }
  
  // Se temos informações detalhadas do afiliador, usamos elas
  if (currentUser.affiliatedToInfo) {
    return {
      name: currentUser.affiliatedToInfo.displayName,
      email: currentUser.affiliatedToInfo.email,
      congregation: currentUser.affiliatedToInfo.congregation || ''
    };
  }
  
  // Caso contrário, usamos os campos básicos
  return {
    name: currentUser.affiliatedTo || '',
    email: currentUser.affiliatedToEmail || '',
    congregation: ''
  };
});

// Computadas para identificar o tipo de usuário
const isAdmin = computed(() => {
  return authStore.currentUser?.role === UserRole.ADMIN;
});

const isAdministrativeRole = computed(() => {
  return authStore.currentUser?.role === UserRole.TESOUREIRO || 
         authStore.currentUser?.role === UserRole.SECRETARIA;
});

const isRegularAffiliate = computed(() => {
  return !!authStore.currentUser?.affiliatedTo && 
         authStore.currentUser?.role === UserRole.USER;
});

// Verificar acesso ao ranking (afiliado OU administrativo)
const hasRankingAccess = computed(() => {
  const user = authStore.currentUser;
  if (!user) return false;
  
  // Verifica se possui afiliação
  const hasAffiliation = !!user.affiliatedTo;
  
  // Verifica se é administrador
  const isAdminRole = [UserRole.ADMIN, UserRole.TESOUREIRO, UserRole.SECRETARIA].includes(user.role);
  
  return hasAffiliation || isAdminRole;
});
</script>

<template>
  <Card title="Ranking de Desempenho">
    <div class="p-6">
      <div class="text-center mb-6">
        <h2 class="text-xl font-bold text-primary mb-2">Acompanhe seu Desempenho</h2>
        
        <!-- Para Afiliados Comuns -->
        <div v-if="isRegularAffiliate" class="bg-gray-50 p-3 rounded-lg mb-4">
          <p class="text-gray-700 font-medium">Você está afiliado a:</p>
          <p class="text-primary font-bold">{{ affiliatorInfo.name }}</p>
          <p v-if="affiliatorInfo.email" class="text-gray-600 text-sm">{{ affiliatorInfo.email }}</p>
          <p v-if="affiliatorInfo.congregation" class="text-gray-500 text-xs">{{ affiliatorInfo.congregation }}</p>
          
          <p class="text-gray-600 mt-2">
            Como afiliado, você pode acompanhar seu desempenho e comparar com outros vendedores.
          </p>
        </div>
        
        <!-- Para Tesoureiro e Secretaria -->
        <div v-else-if="isAdministrativeRole && authStore.currentUser?.affiliatedTo" class="bg-gray-50 p-3 rounded-lg mb-4">
          <p class="text-gray-700 font-medium">Você está afiliado a:</p>
          <p class="text-primary font-bold">{{ affiliatorInfo.name }}</p>
          <p v-if="affiliatorInfo.email" class="text-gray-600 text-sm">{{ affiliatorInfo.email }}</p>
          <p v-if="affiliatorInfo.congregation" class="text-gray-500 text-xs">{{ affiliatorInfo.congregation }}</p>
          
          <p class="text-gray-600 mt-2">
            Como afiliado e membro administrativo, você pode acompanhar seu desempenho e o ranking geral.
          </p>
        </div>
        
        <!-- Para Administrador -->
        <div v-else-if="isAdmin" class="bg-blue-50 p-3 rounded-lg mb-4 border border-blue-200">
          <p class="text-blue-700 font-medium">Acesso de Administrador</p>
          <p class="text-blue-600 text-sm mt-1">
            Como administrador, você pode visualizar o desempenho geral do ranking, incluindo afiliados e administradores com vendas.
          </p>
        </div>
        
        <!-- Para Tesoureiro/Secretaria sem afiliação -->
        <div v-else-if="isAdministrativeRole && !authStore.currentUser?.affiliatedTo" class="bg-yellow-50 p-3 rounded-lg mb-4 border border-yellow-200">
          <p class="text-yellow-700 font-medium">Acesso Administrativo</p>
          <p class="text-yellow-600 text-sm mt-1">
            Como membro administrativo, você tem acesso ao ranking geral de vendas.
          </p>
        </div>
        
        <!-- Fallback para outros casos (não deve ocorrer normalmente) -->
        <div v-else class="bg-yellow-50 p-3 rounded-lg mb-4 border border-yellow-200">
          <p class="text-yellow-700">Ranking disponível</p>
          <p class="text-yellow-600 text-sm">
            Você tem acesso ao ranking de vendas.
          </p>
        </div>
      </div>
      
      <!-- Placeholder para o ranking futuro -->
            <div v-if="hasRankingAccess" class="bg-gray-50 border border-gray-200 p-6 rounded-lg text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-primary opacity-50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <h3 class="text-lg font-medium text-gray-800 mb-2">Ranking em Desenvolvimento</h3>
        <p class="text-gray-600">
          O sistema de ranking está sendo implementado para mostrar estatísticas de vendas e sua posição
          em relação aos demais vendedores. Em breve você poderá ver seu desempenho!
        </p>
      </div>
    </div>
  </Card>
</template>
