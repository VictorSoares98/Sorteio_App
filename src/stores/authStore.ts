import { defineStore } from 'pinia';
import { ref, computed, markRaw } from 'vue';
import type { Router } from 'vue-router';
import { 
  type User as FirebaseUser, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { type User, UserRole } from '../types/user';

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<User | null>(null);
  const firebaseUser = ref<FirebaseUser | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);
  // Referência ao router (sem reatividade)
  let router: Router | undefined;

  // Verifica se o usuário está autenticado
  const isAuthenticated = computed(() => !!currentUser.value);
  
  // Verifica o papel do usuário para permissões
  const userRole = computed(() => currentUser.value?.role || null);
  
  // Verifica se o usuário é admin
  const isAdmin = computed(() => currentUser.value?.role === UserRole.ADMIN);

  /**
   * Inicializa o store com o router 
   */
  function init(routerInstance: Router): void {
    // Armazena o router sem torná-lo reativo
    router = markRaw(routerInstance);
    
    // Inicializa o listener de autenticação
    initAuthListener();
  }

  // Login com email e senha
  const login = async (email: string, password: string, redirectPath?: string): Promise<void> => {
    loading.value = true;
    error.value = null;
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      firebaseUser.value = userCredential.user;
      await fetchUserData();
      
      // Redireciona após login, usando o caminho passado ou o padrão
      if (router) {
        router.push(redirectPath || '/');
      }
    } catch (err: any) {
      console.error('Erro de login:', err);
      
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        error.value = 'Email ou senha incorretos.';
      } else if (err.code === 'auth/too-many-requests') {
        error.value = 'Muitas tentativas. Tente novamente mais tarde.';
      } else {
        error.value = 'Erro ao fazer login. Tente novamente.';
      }
      
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      currentUser.value = null;
      firebaseUser.value = null;
      
      if (router) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
      throw err;
    }
  };

  // Busca dados do usuário no Firestore
  const fetchUserData = async (): Promise<void> => {
    if (!firebaseUser.value) return;
    
    try {
      const userId = firebaseUser.value.uid;
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        currentUser.value = userDoc.data() as User;
      } else {
        error.value = 'Dados do usuário não encontrados.';
        currentUser.value = null;
      }
    } catch (err) {
      console.error('Erro ao buscar dados do usuário:', err);
      error.value = 'Erro ao carregar dados do usuário.';
    }
  };

  // Observa mudanças no estado de autenticação
  const initAuthListener = () => {
    onAuthStateChanged(auth, async (user) => {
      loading.value = true;
      
      try {
        if (user) {
          firebaseUser.value = user;
          await fetchUserData();
        } else {
          currentUser.value = null;
          firebaseUser.value = null;
        }
      } catch (err) {
        console.error('Erro no listener de autenticação:', err);
        error.value = 'Erro ao verificar autenticação.';
      } finally {
        loading.value = false;
      }
    });
  };

  /**
   * Limpa os listeners quando o aplicativo é fechado
   */
  function cleanup(): void {
    // Qualquer limpeza necessária
  }

  return {
    currentUser,
    loading,
    error,
    isAuthenticated,
    userRole,
    isAdmin,
    login,
    logout,
    fetchUserData,
    initAuthListener,
    init,
    cleanup
  };
});
