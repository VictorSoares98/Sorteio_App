<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { computed, onMounted, watch, ref } from 'vue'
import Navbar from './components/layout/Navbar.vue'
import Footer from './components/layout/Footer.vue'
import { useAuthStore } from './stores/authStore'
// Sidebar é importado mas não será usado por enquanto
// import Sidebar from './components/layout/Sidebar.vue'

const route = useRoute()
const authStore = useAuthStore()

// Verifica se a rota atual é uma página de autenticação
const isAuthPage = computed(() => {
  return route.path === '/login' || route.path === '/register'
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

// Remover qualquer código de onMounted que esteja fazendo fetchUserData(true)
onMounted(() => {
  console.log('[App] App montado');
  // Remova ou modifique qualquer chamada para authStore.fetchUserData(true) aqui
})
</script>

<template>
  <div class="flex flex-col min-h-screen">
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
  </div>
</template>
