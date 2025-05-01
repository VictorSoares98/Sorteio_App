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
  signInWithRedirect,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { type User, UserRole } from '../types/user';
import { convertTimestampsInObject, processFirestoreDocument } from '../utils/firebaseUtils';
import { isMobileDevice, isEmbeddedBrowser, isPrivateBrowsing } from '../utils/deviceUtils';

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
      
      // Use redirect fallback for mobile devices, embedded browsers, or private browsing
      // as these environments may not support popups reliably.
      const useRedirect = isMobileDevice() || isEmbeddedBrowser() || isPrivateBrowsing();
      
      let googleUser;
      
      if (useRedirect) {
        await signInWithRedirect(auth, provider);
        return false;
      } else {
        try {
          const result = await signInWithPopup(auth, provider);
          googleUser = result.user;
        } catch (popupError: any) {
          console.warn('[AuthStore] Erro com popup, tentando redirecionamento:', popupError.code);
          
          if (
            popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.message?.includes('Cross-Origin-Opener-Policy')
          ) {
            // When useRedirect is true, signInWithRedirect is called to initiate a redirection flow.
            // Affiliate processing is bypassed in this case as the flow is interrupted.
            await signInWithRedirect(auth, provider);
            return false;
          }
          
          throw popupError;
        }
      }
      
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
        
        await processAffiliateCode(googleUser.uid, pendingAffiliateCode);
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
  }): Promise<boolean> => {
    loading.value = true;
    error.value = null;
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, {
        displayName: userData.displayName
      });
      
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
      
      const pendingAffiliateCode = localStorage.getItem('pendingAffiliateCode');
      await processAffiliateCode(user.uid, pendingAffiliateCode);
      
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

  const fetchUserData = async (forceRefresh = false): Promise<User | null> => {
    if (!firebaseUser.value) {
      console.log('[AuthStore] Não há usuário logado para buscar dados');
      return null;
    }
    
    try {
      console.log('[AuthStore] Buscando dados do usuário', firebaseUser.value.uid);
      
      if (!forceRefresh && currentUser.value) {
        console.log('[AuthStore] Usando dados em cache');
        return currentUser.value;
      }
      
      if (forceRefresh) {
        console.log('[AuthStore] Forçando atualização dos dados');
        userDataCache.delete(firebaseUser.value.uid);
      }
      
      const docRef = doc(db, 'users', firebaseUser.value.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.warn('[AuthStore] Dados do usuário não encontrados');
        return null;
      }
      
      const userData = processFirestoreDocument<User>(docSnap);
      currentUser.value = userData;
      
      userDataCache.set(firebaseUser.value.uid, {
        data: userData,
        timestamp: Date.now()
      });
      
      console.log('[AuthStore] Dados do usuário carregados com sucesso, papel:', userData.role);
      
      if (userData.affiliates && 
          userData.affiliates.length > 0 && 
          userData.role === UserRole.USER) {
        console.warn('[AuthStore] Usuário com afiliados mas sem papel administrativo. Tentando corrigir...');
        try {
          await updateDoc(docRef, {
            role: UserRole.ADMIN
          });
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

  async function processAffiliateCode(userId: string, affiliateCode: string | null): Promise<void> {
    if (!affiliateCode) return;

    console.log('[AuthStore] Processando código de afiliado:', affiliateCode);
    try {
      const profileModule = await import('../services/profile');
      const affiliationResult = await profileModule.affiliateToUser(userId, affiliateCode, false);

      if (affiliationResult.success) {
        console.log('[AuthStore] Afiliação processada com sucesso:', affiliationResult);
        sessionStorage.setItem('newAffiliation', 'true');
        localStorage.removeItem('pendingAffiliateCode');
      } else {
        console.error('[AuthStore] Erro na afiliação:', affiliationResult.message);
      }
    } catch (affiliateError) {
      console.error('[AuthStore] Exceção ao processar afiliação:', affiliateError);
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
    loginWithGoogle,
    sendPasswordResetEmailAction,
    reauthenticateUser,
    updatePasswordAction
  };
});
