<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../stores/authStore';
import { useOrderStore } from '../../stores/orderStore';

const authStore = useAuthStore();
const orderStore = useOrderStore();
const isLoading = ref(true);

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
          
          <button class="mt-6 w-full bg-primary hover:bg-blue-700 text-white py-2 px-4 rounded">
            Editar Perfil
          </button>
        </div>
      </div>
      
      <!-- Meus Pedidos -->
      <div class="md:col-span-2">
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h2 class="text-xl font-semibold mb-4 text-primary">Meus Pedidos</h2>
          
          <div v-if="orderStore.loading" class="text-center py-4">
            <p>Carregando pedidos...</p>
          </div>
          
          <div v-else-if="orderStore.userOrders.length === 0" class="text-center py-4">
            <p class="text-gray-500">Você ainda não realizou nenhum pedido.</p>
            <router-link to="/" class="text-primary hover:underline block mt-2">
              Criar meu primeiro pedido
            </router-link>
          </div>
          
          <div v-else class="space-y-4">
            <div v-for="order in orderStore.userOrders" :key="order.id" 
              class="border border-gray-200 rounded-md p-4">
              <div class="flex justify-between items-start">
                <div>
                  <p class="font-medium">{{ order.buyerName }}</p>
                  <p class="text-sm text-gray-500">
                    {{ new Date(order.createdAt).toLocaleDateString('pt-BR') }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="font-medium">{{ order.paymentMethod === 'pix' ? 'Pix' : 'Dinheiro' }}</p>
                  <p class="text-sm text-gray-500">{{ order.generatedNumbers.length }} números</p>
                </div>
              </div>
              
              <div class="mt-3">
                <p class="text-sm font-semibold">Números:</p>
                <div class="flex flex-wrap gap-1 mt-1">
                  <span v-for="number in order.generatedNumbers" :key="number"
                    class="bg-primary text-white text-xs px-2 py-1 rounded-full">
                    {{ number }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
