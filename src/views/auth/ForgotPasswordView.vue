<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/authStore';
import Alert from '../../components/ui/Alert.vue';

const email = ref('');
const loading = ref(false);
const success = ref(false);
const errorMessage = ref('');
const router = useRouter();
const authStore = useAuthStore();

const resetPassword = async () => {
  if (!email.value) {
    errorMessage.value = 'Por favor, insira seu email';
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    await authStore.sendPasswordResetEmailAction(email.value);
    success.value = true;
  } catch (error: any) {
    errorMessage.value = error.message || 'Ocorreu um erro ao enviar o email de recuperação. Tente novamente.';
    console.error('Erro ao enviar email de recuperação:', error);
  } finally {
    loading.value = false;
  }
};

const goToLogin = () => {
  router.push('/login');
};
</script>

<template>
  <div class="flex justify-center items-center min-h-[80vh]">
    <div class="w-full max-w-md">
      <h1 class="text-3xl font-bold mb-2 text-center">Recuperação de Senha</h1>
      <p class="text-center text-gray-600 mb-8">Enviaremos um email com instruções para redefinir sua senha</p>
      
      <div v-if="success" class="bg-white p-6 rounded-lg shadow-md">
        <Alert type="success" message="Email de recuperação enviado!" class="mb-4" />
        <p class="mb-4 text-gray-700">
          Enviamos um email para <strong>{{ email }}</strong> com instruções para recuperar sua senha.
          Por favor, verifique sua caixa de entrada e siga as instruções no email.
        </p>
        <p class="text-gray-600 text-sm mb-6">
          O link de recuperação é válido por 15 minutos. Se não encontrar o email, verifique sua pasta de spam.
        </p>
        <button
          @click="goToLogin"
          class="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full transition-colors"
        >
          Voltar para Login
        </button>
      </div>
      
      <form v-else @submit.prevent="resetPassword" class="bg-white p-6 rounded-lg shadow-md">
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
        
        <div v-if="errorMessage" class="mb-4 text-danger text-sm">
          {{ errorMessage }}
        </div>
        
        <div class="flex items-center justify-between">
          <button
            type="submit"
            :disabled="loading"
            class="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full transition-colors"
          >
            <span v-if="loading">Processando...</span>
            <span v-else>Enviar Email de Recuperação</span>
          </button>
        </div>
        
        <div class="mt-4 text-center text-sm">
          <router-link to="/login" class="text-primary hover:underline">
            Voltar para o login
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>
