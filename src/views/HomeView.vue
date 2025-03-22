<script setup lang="ts">
import { onMounted } from 'vue';
import OrderForm from '../components/forms/OrderForm.vue';
import { useAuthStore } from '../stores/authStore';
// Adicionar useOrderStore para pré-carregar pedidos do usuário
import { useOrderStore } from '../stores/orderStore';

const authStore = useAuthStore();
const orderStore = useOrderStore();

// Garantir que os dados do usuário e pedidos estejam carregados
onMounted(async () => {
  if (!authStore.currentUser && authStore.isAuthenticated) {
    await authStore.fetchUserData();
    // Após carregar dados do usuário, carregamos os pedidos
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
