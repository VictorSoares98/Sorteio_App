import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserRole } from '../types/user';

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<User | null>(null);
  const firebaseUser = ref<FirebaseUser | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);

  // Verifica se o usuário está autenticado
  const isAuthenticated = computed(() => !!currentUser.value);
  
  // Verifica o papel do usuário para permissões
  const userRole = computed(() => currentUser.value?.role || null);
  
  // Verifica se o usuário é admin
  const isAdmin = computed(() => currentUser.value?.role === UserRole.ADMIN);

  // Login com email e senha
  const login = async (email: string, password: string): Promise<void> => {
    loading.value = true;
    error.value = null;
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      firebaseUser.value = userCredential.user;
      await fetchUserData();
    } catch (err: any) {
      console.error('Erro de login:', err);
      error.value = 'Credenciais inválidas. Por favor, tente novamente.';
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
      
      if (user) {
        firebaseUser.value = user;
        await fetchUserData();
      } else {
        currentUser.value = null;
        firebaseUser.value = null;
      }
      
      loading.value = false;
    });
  };

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
    initAuthListener
  };
});
