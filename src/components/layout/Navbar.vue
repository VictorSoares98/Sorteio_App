<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/authStore';

const router = useRouter();
const authStore = useAuthStore();
const navigateTo = (path: string) => {
  router.push(path);
};

const logout = async () => {
  try {
    await authStore.logout();
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
  }
};
</script>

<template>
  <nav class="bg-primary text-white p-4 shadow-md">
    <div class="container mx-auto flex justify-between items-center">
      <div class="flex items-center space-x-4">
        <h1 class="text-xl font-bold">Sorteio UMADRIMC</h1>
      </div>
      
      <div class="flex items-center space-x-6">
        <template v-if="authStore.isAuthenticated">
          <span v-if="authStore.currentUser" class="mr-2 font-medium">
            Olá, {{ authStore.currentUser.displayName }}
          </span>
          <button @click="navigateTo('/')" class="hover:text-secondary transition-colors">
            Início
          </button>
          <button @click="navigateTo('/profile')" class="hover:text-secondary transition-colors">
            Perfil
          </button>
          <button 
            v-if="authStore.isAdmin" 
            @click="navigateTo('/admin')" 
            class="hover:text-secondary transition-colors"
          >
            Admin
          </button>
          <button @click="logout" class="hover:text-danger transition-colors">
            Sair
          </button>
        </template>
        <template v-else>
          <button @click="navigateTo('/login')" class="hover:text-secondary transition-colors">
            Login
          </button>
          <button @click="navigateTo('/register')" class="hover:text-secondary transition-colors">
            Cadastrar
          </button>
        </template>
      </div>
    </div>
  </nav>
</template>
