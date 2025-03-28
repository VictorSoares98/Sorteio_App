<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { computed, onMounted, watch } from 'vue'
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

// Atualizar dados do usuário quando o estado de autenticação mudar
watch(() => authStore.currentUser, (newValue) => {
  if (newValue) {
    console.log('[App] Usuário autenticado, atualizando dados');
    authStore.fetchUserData(true);
  }
})

// Verificar e atualizar dados do usuário ao montar o componente
onMounted(() => {
  if (authStore.currentUser) {
    console.log('[App] App montado, atualizando dados do usuário');
    authStore.fetchUserData(true);
  }
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
