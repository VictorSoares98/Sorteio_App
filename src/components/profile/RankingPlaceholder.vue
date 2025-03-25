<script setup lang="ts">
import { computed } from 'vue';
import Card from '../ui/Card.vue';
import { useAuthStore } from '../../stores/authStore';

const authStore = useAuthStore();

const affiliatorInfo = computed(() => {
  if (!authStore.currentUser?.affiliatedToInfo) {
    return {
      name: authStore.currentUser?.affiliatedTo || '',
      email: authStore.currentUser?.affiliatedToEmail || ''
    };
  }
  
  return {
    name: authStore.currentUser.affiliatedToInfo.displayName,
    email: authStore.currentUser.affiliatedToInfo.email
  };
});
</script>

<template>
  <Card title="Ranking de Desempenho">
    <div class="p-6">
      <div class="text-center mb-6">
        <h2 class="text-xl font-bold text-primary mb-2">Acompanhe seu Desempenho</h2>
        <div class="bg-gray-50 p-3 rounded-lg mb-4">
          <p class="text-gray-700 font-medium">Você está afiliado a:</p>
          <p class="text-primary font-bold">{{ affiliatorInfo.name }}</p>
          <p class="text-gray-600 text-sm">{{ affiliatorInfo.email }}</p>
        </div>
        <p class="text-gray-600">
          Como afiliado, você pode acompanhar seu desempenho e comparar com outros vendedores.
        </p>
      </div>
      
      <!-- Placeholder para o ranking futuro -->
      <div class="bg-gray-50 border border-gray-200 p-6 rounded-lg text-center">
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
