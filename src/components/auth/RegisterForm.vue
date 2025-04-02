<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { validateEmail, validatePassword, validateName } from '../../utils/validation';
import { useFormValidation } from '../../composables/useFormValidation';
import { useAuthStore } from '../../stores/authStore';
import Input from '../ui/Input.vue';

const displayName = ref('');
const username = ref(''); 
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const errorMessage = ref('');
const loading = ref(false);
const googleLoading = ref(false);
const showPasswords = ref(false); // Único estado para controlar a visibilidade de todas as senhas
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const { errors, validateFormField, isFormValid } = useFormValidation();

// Obter o redirecionamento da query string, se existir
const redirectPath = computed(() => route.query.redirect?.toString() || '/');

// Validação de formulário unificada
const validateFields = () => {
  validateFormField('displayName', displayName.value, {
    'O nome deve ter pelo menos 3 caracteres': value => validateName(value)
  });
  
  validateFormField('username', username.value, {
    'O nome de usuário deve ter pelo menos 5 caracteres': value => Boolean(value && value.length >= 5)
  });
  
  validateFormField('email', email.value, {
    'Por favor, insira um email válido': value => validateEmail(value)
  });
  
  validateFormField('password', password.value, {
    'A senha deve ter pelo menos 6 caracteres': value => validatePassword(value)
  });
  
  validateFormField('confirmPassword', confirmPassword.value, {
    'As senhas não correspondem': value => value === password.value
  });
  
  return isFormValid();
};

// Método de registro modificado para usar o authStore
const register = async () => {
  // Limpar mensagem de erro anterior
  errorMessage.value = '';
  
  // Validar usando o composable
  if (!validateFields()) return;
  
  loading.value = true;
  
  try {
    // Em vez de implementar a lógica diretamente, usar o método do authStore
    // Preparar os dados do usuário no formato esperado pelo authStore.register
    const userData = {
      displayName: displayName.value,
      username: username.value // Passar o username para o store
    };
    
    // Verificar se há um código de afiliação pendente (para logging)
    const pendingCode = localStorage.getItem('pendingAffiliateCode');
    if (pendingCode) {
      console.log('[RegisterForm] Detectado código de afiliação pendente:', pendingCode);
    }
    
    // Chamar o método register do authStore que processa códigos de afiliação
    const success = await authStore.register(email.value, password.value, userData);
    
    if (success) {
      console.log('[RegisterForm] Registro bem-sucedido, redirecionando');
      
      // Verificar novamente se há afiliação pendente
      if (localStorage.getItem('pendingAffiliateCode') || sessionStorage.getItem('newAffiliation')) {
        console.log('[RegisterForm] Afiliação detectada após registro, definindo flag');
      }
      
      // Redirecionar para a página inicial após o cadastro
      router.push('/');
    }
  } catch (error: any) {
    console.error('[RegisterForm] Erro no cadastro:', error);
    
    // Usar a mensagem de erro do store se disponível, ou criar uma mensagem padrão
    errorMessage.value = authStore.error || 'Erro ao criar conta. Tente novamente.';
  } finally {
    loading.value = false;
  }
};

// Função para login com Google
const loginWithGoogle = async () => {
  errorMessage.value = '';
  googleLoading.value = true;
  
  try {
    const success = await authStore.loginWithGoogle(redirectPath.value);
    
    // Se o login não teve sucesso devido ao popup fechado, pegue a mensagem do store
    if (success === false) {
      errorMessage.value = authStore.error || 'Login cancelado. Tente novamente quando estiver pronto.';
    }
    // Se foi bem-sucedido, não precisa fazer nada - o authStore já redireciona
  } catch (error: any) {
    // Outros erros não tratados
    errorMessage.value = authStore.error || 'Erro ao fazer login com Google. Tente novamente.';
    console.error('Erro no login com Google:', error);
  } finally {
    googleLoading.value = false;
  }
};

// Alternar visibilidade de todas as senhas juntas
const togglePasswordVisibility = () => {
  showPasswords.value = !showPasswords.value;
};
</script>

<template>
  <form @submit.prevent="register" class="bg-white p-6 rounded-lg shadow-md">
    <Input
      id="displayName"
      v-model="displayName"
      label="Nome Completo"
      required
      :error="errors.displayName || ''"
    />
    
    <Input
      id="username"
      v-model="username"
      label="Nome de Usuário"
      required
      :error="errors.username || ''"
    />
    
    <Input
      id="email"
      v-model="email"
      label="Email"
      type="email"
      required
      :error="errors.email || ''"
    />
    
    <!-- Campo de senha com visibilidade toggle -->
    <div class="mb-4">
      <label class="block text-gray-700 text-sm font-bold mb-2" for="password">
        Senha
      </label>
      <div class="relative">
        <input
          id="password"
          v-model="password"
          :type="showPasswords ? 'text' : 'password'"
          required
          class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
          placeholder="********"
        />
        <button 
          type="button" 
          @click="togglePasswordVisibility" 
          class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 focus:outline-none"
          tabindex="-1"
        >
          <svg v-if="showPasswords" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </div>
      <p v-if="errors.password" class="mt-1 text-xs text-red-600">
        {{ errors.password }}
      </p>
    </div>
    
    <!-- Campo de confirmação de senha com visibilidade toggle -->
    <div class="mb-4">
      <label class="block text-gray-700 text-sm font-bold mb-2" for="confirmPassword">
        Confirmar Senha
      </label>
      <div class="relative">
        <input
          id="confirmPassword"
          v-model="confirmPassword"
          :type="showPasswords ? 'text' : 'password'"
          required
          class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
          placeholder="********"
        />
        <button 
          type="button" 
          @click="togglePasswordVisibility" 
          class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 focus:outline-none"
          tabindex="-1"
        >
          <svg v-if="showPasswords" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </div>
      <p v-if="errors.confirmPassword" class="mt-1 text-xs text-red-600">
        {{ errors.confirmPassword }}
      </p>
    </div>
    
    <div v-if="errorMessage" class="mb-4 text-danger text-sm">
      {{ errorMessage }}
      
      <!-- Dica adicional quando o erro for relacionado a popup -->
      <p v-if="errorMessage.includes('janela') || errorMessage.includes('popup')" class="mt-1 text-xs text-gray-500">
        Verifique se seu navegador não está bloqueando popups para este site.
      </p>
    </div>
    
    <div class="flex items-center justify-between">
      <button
        type="submit"
        :disabled="loading"
        class="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full transition-colors"
      >
        <span v-if="loading">Processando...</span>
        <span v-else>Cadastrar</span>
      </button>
    </div>
    
    <div class="my-4 flex items-center justify-center">
      <div class="border-t border-gray-300 flex-grow"></div>
      <div class="mx-4 text-gray-500 text-sm">ou</div>
      <div class="border-t border-gray-300 flex-grow"></div>
    </div>
    
    <!-- Botão de login com Google -->
    <button
      type="button"
      @click="loginWithGoogle"
      :disabled="googleLoading"
      class="w-full flex items-center justify-center bg-white border border-gray-300 rounded-md py-2 px-4 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="w-5 h-5 mr-2">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
      </svg>
      <span v-if="googleLoading">Conectando...</span>
      <span v-else>Entrar com Google</span>
    </button>
    
    <div class="mt-4 text-center text-sm">
      <router-link to="/login" class="text-primary hover:text-primary-dark transition-colors">
        Já tem uma conta? Faça login
      </router-link>
    </div>
  </form>
</template>
