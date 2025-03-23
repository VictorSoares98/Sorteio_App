<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { validateEmail, validatePassword, validateName } from '../../utils/validation';
import { UserRole } from '../../types/user';
import { useFormValidation } from '../../composables/useFormValidation';
import Input from '../ui/Input.vue';

const displayName = ref('');
const username = ref(''); // Novo campo para nome de usuário
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const errorMessage = ref('');
const loading = ref(false);
const router = useRouter();

const { errors, validateFormField, isFormValid } = useFormValidation();

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

const register = async () => {
  // Limpar mensagem de erro anterior
  errorMessage.value = '';
  
  // Validar usando o composable
  if (!validateFields()) return;
  
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
      username: username.value, // Salvar nome de usuário em vez de congregação
      email: email.value,
      role: UserRole.USER,
      createdAt: serverTimestamp(),
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
    
    <Input
      id="password"
      v-model="password"
      label="Senha"
      type="password"
      required
      :error="errors.password || ''"
    />
    
    <Input
      id="confirmPassword"
      v-model="confirmPassword"
      label="Confirmar Senha"
      type="password"
      required
      :error="errors.confirmPassword || ''"
    />
    
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
        <span v-else>Cadastrar</span>
      </button>
    </div>
    
    <div class="mt-4 text-center text-sm">
      <router-link to="/login" class="text-primary hover:text-primary-dark transition-colors">
        Já tem uma conta? Faça login
      </router-link>
    </div>
  </form>
</template>
