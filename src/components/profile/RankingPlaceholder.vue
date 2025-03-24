<script setup lang="ts">
import Card from '../ui/Card.vue';
import { useAuthStore } from '../../stores/authStore';

const authStore = useAuthStore();
</script>

<template>
  <Card title="Ranking de Desempenho">
    <div class="p-6">
      <div class="text-center mb-6">
        <h2 class="text-xl font-bold text-primary mb-2">Acompanhe seu Desempenho</h2>
        <p class="text-gray-600">
          Como afiliado de {{ authStore.currentUser?.affiliatedTo }}, você pode acompanhar seu desempenho
          e comparar com outros vendedores.
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
