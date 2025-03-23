<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/authStore';

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const loading = ref(false);
const authStore = useAuthStore();
const route = useRoute();

// Obter o redirecionamento da query string, se existir
const redirectPath = computed(() => route.query.redirect?.toString() || '/');

const login = async () => {
  errorMessage.value = '';
  loading.value = true;
  
  try {
    await authStore.login(email.value, password.value, redirectPath.value);
    // Não precisamos redirecionar manualmente aqui - o store já faz isso
  } catch (error: any) {
    errorMessage.value = authStore.error || 'Email ou senha incorretos. Tente novamente.';
    console.error('Erro no login:', error);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <form @submit.prevent="login" class="bg-white p-6 rounded-lg shadow-md">
    <div class="mb-4">
      <label class="block text-gray-700 text-sm font-bold mb-2" for="email">
        Email
      </label>
      <input
        id="email"
        v-model="email"
        type="email"
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
        placeholder="seu@email.com"
      />
    </div>
    
    <div class="mb-6">
      <label class="block text-gray-700 text-sm font-bold mb-2" for="password">
        Senha
      </label>
      <input
        id="password"
        v-model="password"
        type="password"
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
        placeholder="********"
      />
    </div>
    
    <div v-if="errorMessage" class="mb-4 text-danger text-sm">
      {{ errorMessage }}
    </div>
    
    <div class="flex items-center justify-between">
      <button
        type="submit"
        :disabled="loading"
        class="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full transition-colors"
      >
        <span v-if="loading">Carregando...</span>
        <span v-else>Entrar</span>
      </button>
    </div>
    
    <div class="mt-4 text-center text-sm">
      <router-link to="/register" class="text-primary hover:underline">
        Não tem uma conta? Registre-se
      </router-link>
    </div>
  </form>
</template>
