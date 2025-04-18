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
  signInWithPopup,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { type User, UserRole } from '../types/user';
import { convertTimestampsInObject, processFirestoreDocument } from '../utils/firebaseUtils';

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
            const profileModule = await import('../services/profile');
            const affiliationResult = await profileModule.affiliateToUser(googleUser.uid, pendingAffiliateCode, false);
            
            // Adicionar verificação de sucesso e definir flag newAffiliation
            if (affiliationResult.success) {
              console.log('[AuthStore] Afiliação Google processada com sucesso:', affiliationResult);
              // Definir flag para exibir notificação
              sessionStorage.setItem('newAffiliation', 'true');
            }
            
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

  /**
   * Registra um novo usuário
   */
  const register = async (email: string, password: string, userData: { 
    displayName: string;
    username?: string;
    congregation?: string;
  }): Promise<boolean> => {
    loading.value = true;
    error.value = null;
    
    try {
      // Criar usuário com Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Atualizar displayName do usuário
      await updateProfile(user, {
        displayName: userData.displayName
      });
      
      // Criar documento do usuário no Firestore
      const userDoc = {
        uid: user.uid,
        email: user.email,
        displayName: userData.displayName,
        username: userData.username || userData.displayName.toLowerCase().replace(/\s+/g, '_'),
        photoURL: user.photoURL || '',
        role: UserRole.USER,
        congregation: userData.congregation || '',
        createdAt: serverTimestamp(),
        phone: '',
        affiliateCode: null,
        affiliateCodeExpiry: null,
        affiliatedTo: null,
        affiliatedToId: null,
        affiliatedToEmail: null,
        affiliatedToInfo: null,
        affiliates: []
      };
      
      await setDoc(doc(db, 'users', user.uid), userDoc);
      
      // Verificar se há um código de afiliado pendente no localStorage
      const pendingAffiliateCode = localStorage.getItem('pendingAffiliateCode');
      if (pendingAffiliateCode) {
        console.log('[AuthStore] Processando código de afiliado pendente:', pendingAffiliateCode);
        try {
          // Importar função de afiliação sob demanda para não sobrecarregar o bundle inicial
          const profileModule = await import('../services/profile');
          const affiliationResult = await profileModule.affiliateToUser(user.uid, pendingAffiliateCode, false);
          
          if (affiliationResult.success) {
            console.log('[AuthStore] Afiliação processada com sucesso:', affiliationResult);
            // Definir flag de nova afiliação para exibir notificação
            sessionStorage.setItem('newAffiliation', 'true');
            // Remover código de afiliado do localStorage após uso bem-sucedido
            localStorage.removeItem('pendingAffiliateCode');
          } else {
            console.error('[AuthStore] Erro na afiliação:', affiliationResult.message);
          }
        } catch (affiliateError) {
          console.error('[AuthStore] Exceção ao processar afiliação:', affiliateError);
        }
      }
      
      // Buscar dados completos do usuário após criação
      await fetchUserData(true);
      
      return true;
    } catch (err: any) {
      console.error('[AuthStore] Erro no cadastro:', err);
      
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
   * Busca os dados do usuário atual no Firestore
   */
  const fetchUserData = async (forceRefresh = false): Promise<User | null> => {
    if (!firebaseUser.value) {
      console.log('[AuthStore] Não há usuário logado para buscar dados');
      return null;
    }
    
    try {
      console.log('[AuthStore] Buscando dados do usuário', firebaseUser.value.uid);
      
      // Adicionar uma verificação para prevenir buscas desnecessárias
      if (!forceRefresh && currentUser.value) {
        console.log('[AuthStore] Usando dados em cache');
        return currentUser.value;
      }
      
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

  // Modificar o setupUserDataListener para evitar múltiplos listeners
  const setupUserDataListener = () => {
    if (!firebaseUser.value) return null;
    
    // Limpar listener anterior se existir
    if (userDataUnsubscribe) {
      console.log('[AuthStore] Removendo listener anterior');
      userDataUnsubscribe();
      userDataUnsubscribe = null;
    }
    
    const userDocRef = doc(db, 'users', firebaseUser.value.uid);
    
    console.log('[AuthStore] Configurando novo listener de dados');
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

  // Modificar o watchEffect para ser mais cuidadoso
  let isSettingUpListener = false;
  watchEffect(() => {
    if (firebaseUser.value && isAuthenticated.value && !isSettingUpListener) {
      isSettingUpListener = true;
      setupUserDataListener();
      isSettingUpListener = false;
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

  /**
   * Envia um email de recuperação de senha
   */
  const sendPasswordResetEmailAction = async (email: string): Promise<boolean> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error: any) {
      console.error('Erro ao enviar email de recuperação:', error);
      
      let errorMessage = 'Falha ao enviar email de recuperação. Tente novamente.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Não existe uma conta associada a este email.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'O formato do email é inválido.';
      } else if (error.code === 'auth/missing-email') {
        errorMessage = 'Por favor, insira seu email.';
      }
      
      error.value = errorMessage;
      throw new Error(errorMessage);
    }
  };

  /**
   * Reautentica o usuário atual (necessário para operações sensíveis)
   */
  const reauthenticateUser = async (password: string): Promise<boolean> => {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('Usuário não encontrado ou sem email associado');
      }
      
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      return true;
    } catch (error: any) {
      console.error('Erro ao reautenticar usuário:', error);
      
      let errorMessage = 'Falha na autenticação. Verifique sua senha e tente novamente.';
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Senha incorreta.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas incorretas. Tente novamente mais tarde.';
      } else if (error.code === 'auth/user-mismatch') {
        errorMessage = 'As credenciais não correspondem ao usuário atualmente conectado.';
      }
      
      error.value = errorMessage;
      throw new Error(errorMessage);
    }
  };

  /**
   * Atualiza a senha do usuário atual
   */
  const updatePasswordAction = async (newPassword: string): Promise<boolean> => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Usuário não encontrado');
      }
      
      await updatePassword(user, newPassword);
      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);
      
      let errorMessage = 'Falha ao atualizar senha. Tente novamente.';
      
      if (error.code === 'auth/weak-password') {
        errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Esta operação é sensível e requer autenticação recente. Faça login novamente antes de tentar novamente.';
      }
      
      error.value = errorMessage;
      throw new Error(errorMessage);
    }
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
    register,
    fetchUserData,
    initAuthListener,
    init,
    cleanup,
    loginWithGoogle,
    sendPasswordResetEmailAction,
    reauthenticateUser,
    updatePasswordAction
  };
});
