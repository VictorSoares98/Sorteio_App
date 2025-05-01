<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { computed, onMounted, watch, ref, onUnmounted } from 'vue'
import Navbar from './components/layout/Navbar.vue'
import Footer from './components/layout/Footer.vue'
import AdblockWarning from './components/ui/AdblockWarning.vue'
import EmulatorNotice from './components/ui/EmulatorNotice.vue'
import { useAuthStore } from './stores/authStore'
import { useOrderStore } from './stores/orderStore'

const route = useRoute()
const authStore = useAuthStore()
const orderStore = useOrderStore()

// Verifica se a rota atual é uma página de autenticação
const isAuthPage = computed(() => {
  return route.path === '/login' || route.path === '/cadastro'
})

// Variável para controlar se já verificamos o usuário
const userDataUpdated = ref(false);

// Atualização de dados do usuário para evitar loop infinito
watch(() => authStore.isAuthenticated, (isAuthenticated) => {
  if (isAuthenticated && !userDataUpdated.value) {
    console.log('[App] Usuário autenticado, atualizando dados (única vez)');
    userDataUpdated.value = true;
    authStore.fetchUserData(false); // Usar false para evitar forçar refresh desnecessariamente
  }
});

// Se necessário, podemos resetar a flag quando o usuário fizer logout
watch(() => !authStore.isAuthenticated, (isLoggedOut) => {
  if (isLoggedOut) {
    userDataUpdated.value = false;
  }
});

// Verificar afiliações após navegação para a página inicial
onMounted(() => {
  console.log('[App] App montado');

  // Se está na página inicial e tem newAffiliation, atualizar dados do usuário
  if (route.path === '/' && sessionStorage.getItem('newAffiliation') === 'true') {
    if (authStore.isAuthenticated) {
      console.log('[App] Detectada possível nova afiliação');
      authStore.fetchUserData(true)
        .then(() => {
          console.log('[App] Dados do usuário atualizados com sucesso');
        })
        .catch(err => {
          console.error('[App] Erro ao atualizar dados de usuário:', err);
        });
    }
  }
})

// Limpar recursos e event listeners quando o componente é desmontado
onUnmounted(() => {
  // Limpar intervalos de polling se estiverem ativos
  orderStore.cleanup();
})
</script>

<template>
  <div class="flex flex-col min-h-screen bg-gray-50">
    <header v-if="!isAuthPage" class="w-full sticky top-0 z-50">
      <Navbar />
    </header>
    
    <div class="flex flex-grow">
      <!-- Sidebar removido temporariamente -->
      <!-- Caso precise restaurar no futuro: 
      <aside v-if="!isAuthPage" class="hidden md:block md:w-64 lg:w-72">
        <Sidebar />
      </aside>
      -->
      
      <main class="w-full p-2 md:p-4">
        <div class="max-w-7xl mx-auto">
          <RouterView />
        </div>
      </main>
    </div>
    
    <footer class="w-full mt-auto">
      <Footer />
    </footer>

    <!-- Componente de aviso de bloqueador -->
    <AdblockWarning />

    <!-- Adicionar o componente de aviso de emulador -->
    <EmulatorNotice />
  </div>
</template>
