<script setup lang="ts">
import { onMounted } from 'vue';
import OrderForm from '../components/forms/OrderForm.vue';
import { useAuthStore } from '../stores/authStore';
import { useOrderStore } from '../stores/orderStore';

const authStore = useAuthStore();
const orderStore = useOrderStore();

// Carrega dados necessários quando o componente é montado
onMounted(async () => {
  // Apenas carregue dados se o usuário estiver autenticado mas sem dados carregados
  if (authStore.isAuthenticated && !authStore.currentUser) {
    await authStore.fetchUserData();
    // Carrega os pedidos do usuário após buscar seus dados
    await orderStore.fetchUserOrders();
  }
});
</script>

<template>
  <div class="container mx-auto py-8">
    <h1 class="text-3xl font-bold mb-8 text-center">Formulário de Pedidos</h1>
    
    <div v-if="authStore.loading" class="text-center py-8">
      <p>Carregando...</p>
    </div>
    
    <div v-else-if="!authStore.isAuthenticated" class="text-center py-8">
      <p class="mb-4">Você precisa estar logado para criar um pedido.</p>
      <router-link to="/login" class="text-primary hover:underline">Fazer login</router-link>
    </div>
    
    <OrderForm v-else />
  </div>
</template>
