<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types/user';

const router = useRouter();
const authStore = useAuthStore();
const isMenuOpen = ref(false);

// Recalcular as permissões sempre que o papel do usuário mudar
const isAdmin = computed(() => {
  return authStore.currentUser?.role === UserRole.ADMIN || 
         authStore.currentUser?.role === UserRole.SECRETARIA || 
         authStore.currentUser?.role === UserRole.TESOUREIRO;
});

// Verificar a cada transição de rota se os dados do usuário precisam ser atualizados
onMounted(() => {
  // Força a atualização dos dados do usuário ao montar o componente
  if (authStore.isAuthenticated) {
    console.log('[NavBar] Atualizando dados do usuário no mount');
    authStore.fetchUserData();
  }
});

// Observar mudanças de autenticação para atualizar a interface
watch(() => authStore.isAuthenticated, (newValue) => {
  if (newValue) {
    console.log('[NavBar] Detectada mudança de autenticação, atualizando dados');
    authStore.fetchUserData();
  }
});

const navigateTo = (path: string) => {
  router.push(path);
  isMenuOpen.value = false; // Fecha o menu após navegação
};

const logout = async () => {
  try {
    await authStore.logout();
    isMenuOpen.value = false; // Fecha o menu após logout
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
  }
};

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};
</script>

<template>
  <nav class="bg-primary text-white shadow-md w-full">
    <div class="container max-w-7xl mx-auto px-4">
      <div class="flex justify-between items-center h-16">
        <!-- Logo/Brand -->
        <div class="flex-shrink-0">
          <h1 class="text-xl font-bold">Tá nas Mãos de Deus</h1>
        </div>
        
        <!-- Menu Desktop -->
        <div class="hidden md:flex items-center space-x-4">
          <template v-if="authStore.isAuthenticated">
            <span v-if="authStore.currentUser" class="font-medium text-sm md:text-base">
              Olá, {{ authStore.currentUser.displayName }}
            </span>
            <button @click="navigateTo('/')" class="px-3 py-2 rounded hover:bg-primary-dark text-sm md:text-base transition-colors">
              Início
            </button>
            <button @click="navigateTo('/profile')" class="px-3 py-2 rounded hover:bg-primary-dark text-sm md:text-base transition-colors">
              Perfil
            </button>
            <button 
              v-if="isAdmin" 
              @click="navigateTo('/admin')" 
              class="px-3 py-2 rounded hover:bg-primary-dark text-sm md:text-base transition-colors"
            >
              Admin
            </button>
            <button @click="logout" class="px-3 py-2 rounded hover:bg-danger text-sm md:text-base transition-colors">
              Sair
            </button>
          </template>
          <template v-else>
            <button @click="navigateTo('/login')" class="px-3 py-2 rounded hover:bg-primary-dark text-sm md:text-base transition-colors">
              Login
            </button>
            <button @click="navigateTo('/register')" class="px-3 py-2 rounded hover:bg-primary-dark text-sm md:text-base transition-colors">
              Cadastrar
            </button>
          </template>
        </div>
        
        <!-- Menu Mobile Button -->
        <div class="block md:hidden">
          <button 
            @click="toggleMenu" 
            class="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-primary-dark focus:outline-none transition-colors"
            aria-label="Menu principal"
          >
            <svg v-if="!isMenuOpen" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg v-else class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Mobile Menu -->
      <div 
        :class="{
          'mobile-menu-open': isMenuOpen,
          'mobile-menu-closed': !isMenuOpen,
          'mobile-menu': true,
          'md:hidden': true
        }"
      >
        <div class="px-2 pt-2 pb-3 space-y-1 border-t border-primary-light">
          <template v-if="authStore.isAuthenticated">
            <div v-if="authStore.currentUser" class="px-3 py-2 font-medium border-b border-primary-light mb-2">
              Olá, {{ authStore.currentUser.displayName }}
            </div>
            <button @click="navigateTo('/')" class="block w-full text-left px-3 py-2 rounded hover:bg-primary-dark transition-colors">
              Início
            </button>
            <button @click="navigateTo('/profile')" class="block w-full text-left px-3 py-2 rounded hover:bg-primary-dark transition-colors">
              Perfil
            </button>
            <button 
              v-if="isAdmin" 
              @click="navigateTo('/admin')" 
              class="block w-full text-left px-3 py-2 rounded hover:bg-primary-dark transition-colors"
            >
              Admin
            </button>
            <button @click="logout" class="block w-full text-left px-3 py-2 rounded hover:bg-danger transition-colors mt-2 border-t border-primary-light pt-3">
              Sair
            </button>
          </template>
          <template v-else>
            <button @click="navigateTo('/login')" class="block w-full text-left px-3 py-2 rounded hover:bg-primary-dark transition-colors">
              Login
            </button>
            <button @click="navigateTo('/register')" class="block w-full text-left px-3 py-2 rounded hover:bg-primary-dark transition-colors">
              Cadastrar
            </button>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* Estilos para o menu mobile */
.mobile-menu {
  transition: max-height 0.3s ease-in-out, opacity 0.3s ease-in-out;
  overflow: hidden;
}

.mobile-menu-closed {
  max-height: 0;
  opacity: 0;
  visibility: hidden;
}

.mobile-menu-open {
  max-height: 500px;
  opacity: 1;
  visibility: visible;
}

/* Garantir que o botão de menu seja bem visível */
button[aria-label="Menu principal"] {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 0.375rem;
  background-color: rgba(255, 255, 255, 0.1);
}
</style>
