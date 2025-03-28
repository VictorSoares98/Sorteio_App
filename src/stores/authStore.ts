import { defineStore } from 'pinia';
import { ref, computed, markRaw, watchEffect } from 'vue';
import type { Router } from 'vue-router';
import { 
  type User as FirebaseUser, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { type User, UserRole } from '../types/user';
import { convertTimestampsInObject, processFirestoreDocument } from '../utils/firebaseUtils';
import { affiliateToUser } from '../services/profile';

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<User | null>(null);
  const firebaseUser = ref<FirebaseUser | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);
  let router: Router | undefined;
  let userDataUnsubscribe: (() => void) | null = null;
  const userDataCache = new Map<string, { data: User; timestamp: number }>();

  const isAuthenticated = computed(() => !!currentUser.value);
  const userRole = computed(() => currentUser.value?.role || null);
  const isAdmin = computed(() => currentUser.value?.role === UserRole.ADMIN);

  function init(routerInstance: Router): void {
    router = markRaw(routerInstance);
    initAuthListener();
  }

  const login = async (email: string, password: string, redirectPath?: string): Promise<void> => {
    loading.value = true;
    error.value = null;
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      firebaseUser.value = userCredential.user;
      await fetchUserData();
      
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

  const loginWithGoogle = async (redirectPath = '/') => {
    try {
      error.value = null;
      loading.value = true;
      
      const pendingAffiliateCode = localStorage.getItem('pendingAffiliateCode');
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      
      const userRef = doc(db, 'users', googleUser.uid);
      const userDoc = await getDoc(userRef);
      
      const isNewUser = !userDoc.exists();
      
      if (isNewUser) {
        await setDoc(userRef, {
          id: googleUser.uid,
          displayName: googleUser.displayName || 'Usuário Google',
          username: googleUser.displayName?.toLowerCase().replace(/\s+/g, '_') || `user_${Date.now()}`,
          email: googleUser.email || '',
          role: UserRole.USER,
          createdAt: serverTimestamp(),
          photoURL: googleUser.photoURL || '',
          authProvider: 'google'
        });
        
        if (pendingAffiliateCode) {
          console.log('[AuthStore] Processando afiliação para novo usuário Google com código:', pendingAffiliateCode);
          try {
            await affiliateToUser(googleUser.uid, pendingAffiliateCode, false);
            localStorage.removeItem('pendingAffiliateCode');
          } catch (affiliateError) {
            console.error('[AuthStore] Erro ao processar afiliação:', affiliateError);
          }
        }
      }
      
      await fetchUserData();
      
      if (router) {
        router.push(redirectPath);
      }

      return true;
      
    } catch (err: any) {
      console.error('Erro ao fazer login com Google:', err);
      
      if (err.code === 'auth/popup-closed-by-user') {
        error.value = 'Login cancelado. A janela de autenticação foi fechada antes de concluir.';
        return false;
      } else if (err.code === 'auth/popup-blocked') {
        error.value = 'O popup foi bloqueado pelo navegador. Verifique suas configurações de popup ou tente novamente.';
        return false;
      } else {
        error.value = err.message || 'Ocorreu um erro ao fazer login com o Google.';
        throw err;
      }
    } finally {
      loading.value = false;
    }
  };

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

  const register = async (email: string, password: string, userData: { 
    displayName: string;
    username?: string;
    congregation?: string;
  }) => {
    loading.value = true;
    error.value = null;
    
    try {
      const pendingAffiliateCode = localStorage.getItem('pendingAffiliateCode');
      console.log('[AuthStore] Iniciando registro com código de afiliação pendente:', pendingAffiliateCode);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, {
        displayName: userData.displayName
      });
      
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        displayName: userData.displayName,
        email: email,
        username: userData.username || userData.displayName.toLowerCase().replace(/\s+/g, '_'),
        role: UserRole.USER,
        congregation: userData.congregation || '',
        createdAt: serverTimestamp(),
      });
      
      if (pendingAffiliateCode) {
        console.log('[AuthStore] Processando afiliação para novo usuário com código:', pendingAffiliateCode);
        try {
          const affiliationResult = await affiliateToUser(user.uid, pendingAffiliateCode, false);
          
          if (affiliationResult.success) {
            console.log('[AuthStore] Afiliação processada com sucesso:', affiliationResult);
            localStorage.removeItem('pendingAffiliateCode');
          } else {
            console.error('[AuthStore] Erro na afiliação:', affiliationResult.message);
          }
        } catch (affiliateError) {
          console.error('[AuthStore] Exceção ao processar afiliação:', affiliateError);
        }
      }
      
      await fetchUserData();
      
      return true;
    } catch (err: any) {
      console.error('Erro no cadastro:', err);
      
      if (err.code === 'auth/email-already-in-use') {
        error.value = 'Este email já está em uso.';
      } else {
        error.value = 'Erro ao criar conta. Tente novamente.';
      }
      
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Busca dados do usuário logado com opção para forçar a atualização
   */
  const fetchUserData = async (forceRefresh = false): Promise<User | null> => {
    if (!firebaseUser.value) {
      console.log('[AuthStore] Não há usuário logado para buscar dados');
      return null;
    }
    
    try {
      console.log('[AuthStore] Buscando dados do usuário', firebaseUser.value.uid);
      
      // Buscar dados diretamente do Firestore para garantir dados atualizados
      if (forceRefresh) {
        console.log('[AuthStore] Forçando atualização dos dados');
        // Limpar cache se existir
        userDataCache.delete(firebaseUser.value.uid);
      }
      
      const docRef = doc(db, 'users', firebaseUser.value.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.warn('[AuthStore] Dados do usuário não encontrados');
        return null;
      }
      
      // Processar e armazenar dados
      const userData = processFirestoreDocument<User>(docSnap);
      currentUser.value = userData;
      
      // Atualizar cache com timestamp para controle de dados antigos
      userDataCache.set(firebaseUser.value.uid, {
        data: userData,
        timestamp: Date.now()
      });
      
      console.log('[AuthStore] Dados do usuário carregados com sucesso, papel:', userData.role);
      
      // Verificar se o usuário tem afiliados mas não tem papel administrativo
      // Isso serve como uma verificação adicional de segurança
      if (userData.affiliates && 
          userData.affiliates.length > 0 && 
          userData.role === UserRole.USER) {
        console.warn('[AuthStore] Usuário com afiliados mas sem papel administrativo. Tentando corrigir...');
        try {
          // Corrigir o papel diretamente
          await updateDoc(docRef, {
            role: UserRole.ADMIN
          });
          // Recarregar os dados após a correção
          return await fetchUserData(true);
        } catch (fixError) {
          console.error('[AuthStore] Falha ao corrigir papel do usuário:', fixError);
        }
      }
      
      return userData;
    } catch (error) {
      console.error('[AuthStore] Erro ao buscar dados do usuário:', error);
      return null;
    }
  };

  const setupUserDataListener = () => {
    if (!firebaseUser.value) return null;
    
    const userDocRef = doc(db, 'users', firebaseUser.value.uid);
    
    if (userDataUnsubscribe) {
      userDataUnsubscribe();
    }
    
    userDataUnsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        console.log('[AuthStore] Dados do usuário atualizados via listener');
        const userData = convertTimestampsInObject(docSnapshot.data());
        currentUser.value = userData as User;
      }
    }, (error) => {
      console.error('[AuthStore] Erro no listener de dados do usuário:', error);
    });
    
    return userDataUnsubscribe;
  };

  watchEffect(() => {
    if (firebaseUser.value && isAuthenticated.value) {
      setupUserDataListener();
    }
  });

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

  function cleanup(): void {
    if (userDataUnsubscribe) {
      userDataUnsubscribe();
    }
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
    register,
    fetchUserData,
    initAuthListener,
    init,
    cleanup,
    loginWithGoogle
  };
});
