<script setup lang="ts">
import { onMounted, ref } from 'vue';
import OrderForm from '../components/forms/OrderForm.vue';
import { useAuthStore } from '../stores/authStore';
import { useOrderStore } from '../stores/orderStore';

const authStore = useAuthStore();
const orderStore = useOrderStore();

// Verificar se há notificação de afiliação pendente
const hasNewAffiliation = sessionStorage.getItem('newAffiliation') === 'true';
console.log('[HomeView] Verificando nova afiliação:', hasNewAffiliation);

// Dados da afiliação para exibir na notificação
const showAffiliationNotification = ref(false);
const affiliationUserData = ref({
  name: '',
  email: ''
});

// Melhorar a verificação da afiliação
onMounted(async () => {
  console.log('[HomeView] Componente montado, verificando afiliação');
  
  // Garantir que temos dados atualizados do usuário
  if (authStore.isAuthenticated) {
    if (!authStore.currentUser) {
      console.log('[HomeView] Buscando dados do usuário');
      await authStore.fetchUserData(true); // Forçar atualização para ter dados mais recentes
    }
    
    // Carregar pedidos do usuário após ter seus dados
    if (authStore.currentUser) {
      await orderStore.fetchUserOrders();
    }
  }
  
  // Verificar se há uma nova afiliação para exibir notificação
  if (hasNewAffiliation && authStore.isAuthenticated && authStore.currentUser) {
    console.log('[HomeView] Verificando dados de afiliação para notificação');
    
    // Verificar se temos dados de afiliação
    if (authStore.currentUser.affiliatedTo) {
      console.log('[HomeView] Exibindo notificação de afiliação bem-sucedida');
      showAffiliationNotification.value = true;
      affiliationUserData.value = {
        name: authStore.currentUser.affiliatedTo,
        email: authStore.currentUser.affiliatedToEmail || ''
      };
      
      // Limpar a flag após exibir a notificação
      sessionStorage.removeItem('newAffiliation');
      
      // Fechar automaticamente após 10 segundos para dar mais tempo de leitura
      setTimeout(() => {
        showAffiliationNotification.value = false;
      }, 10000);
    } else {
      console.warn('[HomeView] Flag de afiliação presente, mas dados de afiliação ausentes');
      // Verificar se precisamos atualizar os dados novamente
      if (!authStore.loading) {
        console.log('[HomeView] Tentando atualizar dados do usuário');
        await authStore.fetchUserData(true);
        
        // Verificar novamente após atualização
        if (authStore.currentUser?.affiliatedTo) {
          console.log('[HomeView] Dados atualizados, exibindo notificação');
          showAffiliationNotification.value = true;
          affiliationUserData.value = {
            name: authStore.currentUser.affiliatedTo,
            email: authStore.currentUser.affiliatedToEmail || ''
          };
          
          // Limpar a flag
          sessionStorage.removeItem('newAffiliation');
          
          setTimeout(() => {
            showAffiliationNotification.value = false;
          }, 10000);
        } else {
          console.warn('[HomeView] Dados atualizados, mas ainda sem afiliação');
          sessionStorage.removeItem('newAffiliation');
        }
      } else {
        // Se estiver carregando, aguardar e remover a flag
        sessionStorage.removeItem('newAffiliation');
      }
    }
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
    
    <!-- Notificação de afiliação concluída com sucesso - Agora com largura responsiva -->
    <div v-if="showAffiliationNotification"
         class="mb-8 bg-green-50 border-l-4 border-green-500 p-4 rounded-md shadow-md relative transition-all duration-300 w-full max-w-3xl mx-auto">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <button @click="closeNotification" class="absolute top-2 right-2 text-green-600 hover:text-green-800">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
    
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
