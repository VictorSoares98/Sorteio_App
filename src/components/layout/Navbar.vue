<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types/user';

const router = useRouter();
const authStore = useAuthStore();
const isMenuOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);
const menuButtonRef = ref<HTMLElement | null>(null);

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
  
  // Adicionar event listener para cliques fora do menu
  document.addEventListener('click', handleClickOutside);
});

// Remover event listeners quando o componente é desmontado
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
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

const toggleMenu = (event?: MouseEvent) => {
  if (event) {
    event.stopPropagation();
  }
  isMenuOpen.value = !isMenuOpen.value;
};

// Fechar o menu quando clicar fora dele
const handleClickOutside = (event: MouseEvent) => {
  if (
    isMenuOpen.value && 
    menuRef.value && 
    menuButtonRef.value && 
    !menuRef.value.contains(event.target as Node) &&
    !menuButtonRef.value.contains(event.target as Node)
  ) {
    isMenuOpen.value = false;
  }
};

// Função para gerar avatar padrão baseado no nome do usuário
const getDefaultAvatar = (name: string) => {
  // Usando Dicebear como serviço de avatar padrão (não requer o Firebase Storage)
  const seed = encodeURIComponent(name || 'user');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=FF8C00`;
};

// Função para obter a URL da foto de perfil
const getProfilePicture = (user: any) => {
  // Se o usuário tiver photoURL no objeto de dados (que vem do Firestore)
  // isso será a imagem base64 ou URL completa
  if (user?.photoURL) {
    return user.photoURL;
  }
  
  // Fallback para avatar gerado
  return getDefaultAvatar(user?.displayName || '');
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
            <div class="flex items-center space-x-3">
              <!-- Foto de perfil (desktop) -->
              <div class="w-8 h-8 rounded-full overflow-hidden bg-white flex-shrink-0 border-2 border-white">
                <img 
                  :src="getProfilePicture(authStore.currentUser)" 
                  :alt="authStore.currentUser?.displayName || 'Usuário'"
                  class="w-full h-full object-cover"
                />
              </div>
              <span v-if="authStore.currentUser" class="font-medium text-sm md:text-base">
                <span>{{ authStore.currentUser.displayName }}</span>
                <span class="text-xs text-secondary-light ml-1" v-if="authStore.currentUser.username">
                  (@{{ authStore.currentUser.username }})
                </span>
              </span>
            </div>
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
              Painel
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
            ref="menuButtonRef"
            @click.stop="toggleMenu($event)" 
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
        ref="menuRef"
        :class="{
          'mobile-menu-open': isMenuOpen,
          'mobile-menu-closed': !isMenuOpen,
          'mobile-menu': true,
          'md:hidden': true
        }"
      >
        <div class="px-2 pt-2 pb-3 space-y-1 border-t border-primary-light">
          <template v-if="authStore.isAuthenticated">
            <div v-if="authStore.currentUser" class="px-3 py-2 font-medium border-b border-primary-light mb-2 flex items-center space-x-3">
              <!-- Foto de perfil (mobile) -->
              <div class="w-10 h-10 rounded-full overflow-hidden bg-white flex-shrink-0 border-2 border-white">
                <img 
                  :src="getProfilePicture(authStore.currentUser)" 
                  :alt="authStore.currentUser.displayName"
                  class="w-full h-full object-cover"
                />
              </div>
              <div>
                <div>{{ authStore.currentUser.displayName }}</div>
                <div class="text-xs text-secondary-light" v-if="authStore.currentUser.username">
                  @{{ authStore.currentUser.username }}
                </div>
              </div>
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
