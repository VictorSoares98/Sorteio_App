<script setup lang="ts">
import { onMounted, ref } from 'vue';
import OrderForm from '../components/forms/OrderForm.vue';
import { useAuthStore } from '../stores/authStore';
import { useOrderStore } from '../stores/orderStore';

const authStore = useAuthStore();
const orderStore = useOrderStore();

// Estado para controlar a exibição da notificação de afiliação
const showAffiliationNotification = ref(false);
const affiliationUserData = ref({
  name: '',
  email: ''
});

// Carrega dados necessários quando o componente é montado
onMounted(async () => {
  // Verificar se há uma afiliação recente
  const hasNewAffiliation = sessionStorage.getItem('newAffiliation') === 'true';
  
  // Apenas carregue dados se o usuário estiver autenticado mas sem dados carregados
  if (authStore.isAuthenticated && !authStore.currentUser) {
    await authStore.fetchUserData();
    // Carrega os pedidos do usuário após buscar seus dados
    await orderStore.fetchUserOrders();
  }
  
  // Se o usuário está autenticado e há uma nova afiliação, exibir notificação
  if (hasNewAffiliation && authStore.currentUser && authStore.currentUser.affiliatedTo) {
    showAffiliationNotification.value = true;
    affiliationUserData.value = {
      name: authStore.currentUser.affiliatedTo,
      email: authStore.currentUser.affiliatedToEmail || ''
    };
    // Limpar a flag após exibir a notificação
    sessionStorage.removeItem('newAffiliation');
    
    // Fechar automaticamente após 5 segundos
    setTimeout(() => {
      showAffiliationNotification.value = false;
    }, 5000);
  }
});

// Fechar notificação
const closeNotification = () => {
  showAffiliationNotification.value = false;
};
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
    
    <!-- Notificação de Afiliação Bem-sucedida -->
    <div 
      v-if="showAffiliationNotification" 
      class="fixed bottom-4 right-4 max-w-md w-full bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 z-50 animate-rise"
    >
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-green-800">Afiliação concluída com sucesso</h3>
          <div class="mt-2 text-sm text-green-700">
            <p>Você está agora afiliado(a) a <strong>{{ affiliationUserData.name }}</strong></p>
            <p v-if="affiliationUserData.email" class="text-xs mt-1">{{ affiliationUserData.email }}</p>
          </div>
          <div class="mt-3 flex">
            <button 
              @click="closeNotification"
              class="bg-green-200 text-green-800 px-2 py-1 rounded text-xs font-medium hover:bg-green-300 transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
        <div class="ml-auto pl-3">
          <div class="-mx-1.5 -my-1.5">
            <button 
              @click="closeNotification" 
              class="inline-flex rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none"
            >
              <span class="sr-only">Fechar</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Animação para a notificação subir suavemente */
@keyframes rise {
  0% { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

.animate-rise {
  animation: rise 0.3s ease-out forwards;
}
</style>
