<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { validateEmail, validatePassword, validateName } from '../../utils/validation';
import { UserRole } from '../../types/user';

const displayName = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const congregation = ref('');
const errorMessage = ref('');
const loading = ref(false);
const router = useRouter();

const register = async () => {
  // Limpar mensagem de erro anterior
  errorMessage.value = '';
  
  // Validar campos
  if (!validateName(displayName.value)) {
    errorMessage.value = 'O nome deve ter pelo menos 3 caracteres.';
    return;
  }
  
  if (!validateEmail(email.value)) {
    errorMessage.value = 'Por favor, insira um email válido.';
    return;
  }
  
  if (!validatePassword(password.value)) {
    errorMessage.value = 'A senha deve ter pelo menos 6 caracteres.';
    return;
  }
  
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'As senhas não correspondem.';
    return;
  }
  
  loading.value = true;
  
  try {
    // Criar o usuário no Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
    const user = userCredential.user;
    
    // Atualizar o perfil do usuário com o displayName
    await updateProfile(user, {
      displayName: displayName.value
    });
    
    // Salvar dados adicionais no Firestore
    await setDoc(doc(db, 'users', user.uid), {
      id: user.uid,
      displayName: displayName.value,
      email: email.value,
      role: UserRole.USER, // Padrão para novos usuários
      congregation: congregation.value,
      createdAt: serverTimestamp(),
      // O affiliateCode será gerado em uma função separada ou pelo admin
    });
    
    // Redirecionar para a página inicial após o cadastro
    router.push('/');
  } catch (error: any) {
    console.error('Erro no cadastro:', error);
    
    // Tratar erros comuns
    if (error.code === 'auth/email-already-in-use') {
      errorMessage.value = 'Este email já está em uso.';
    } else {
      errorMessage.value = 'Erro ao criar conta. Tente novamente.';
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <form @submit.prevent="register" class="bg-white p-6 rounded-lg shadow-md">
    <div class="mb-4">
      <label class="block text-gray-700 text-sm font-bold mb-2" for="displayName">
        Nome Completo
      </label>
      <input
        id="displayName"
        v-model="displayName"
        type="text"
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
      />
    </div>
    
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
      />
    </div>
    
    <div class="mb-4">
      <label class="block text-gray-700 text-sm font-bold mb-2" for="congregation">
        Congregação
      </label>
      <input
        id="congregation"
        v-model="congregation"
        type="text"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
      />
    </div>
    
    <div class="mb-4">
      <label class="block text-gray-700 text-sm font-bold mb-2" for="password">
        Senha
      </label>
      <input
        id="password"
        v-model="password"
        type="password"
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
      />
    </div>
    
    <div class="mb-6">
      <label class="block text-gray-700 text-sm font-bold mb-2" for="confirmPassword">
        Confirmar Senha
      </label>
      <input
        id="confirmPassword"
        v-model="confirmPassword"
        type="password"
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
      />
    </div>
    
    <div v-if="errorMessage" class="mb-4 text-danger text-sm">
      {{ errorMessage }}
    </div>
    
    <div class="flex items-center justify-between">
      <button
        type="submit"
        :disabled="loading"
        class="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
      >
        <span v-if="loading">Processando...</span>
        <span v-else>Cadastrar</span>
      </button>
    </div>
    
    <div class="mt-4 text-center text-sm">
      <router-link to="/login" class="text-primary hover:underline">
        Já tem uma conta? Faça login
      </router-link>
    </div>
  </form>
</template>
