import { defineStore } from 'pinia';
import { ref, computed, markRaw } from 'vue';
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
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { type User, UserRole } from '../types/user';
import { convertTimestampsInObject } from '../utils/firebaseUtils';
import { affiliateToUser } from '../services/profile';

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

  // Login com Google modificado para processar afiliação
  const loginWithGoogle = async (redirectPath = '/') => {
    try {
      error.value = null;
      loading.value = true;
      
      // Verificar se existe um código de afiliação pendente
      const pendingAffiliateCode = localStorage.getItem('pendingAffiliateCode');
      
      // Criar provedor do Google
      const provider = new GoogleAuthProvider();
      // Adicionar escopos de acesso, se necessário
      provider.addScope('email');
      provider.addScope('profile');
      
      // Fazer login com popup
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      
      // Verificar se o usuário já existe no Firestore
      const userRef = doc(db, 'users', googleUser.uid);
      const userDoc = await getDoc(userRef);
      
      // Flag para indicar se é um novo usuário
      const isNewUser = !userDoc.exists();
      
      if (isNewUser) {
        // Se não existe, criar perfil básico para o usuário
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
        
        // Se for novo usuário e tiver código de afiliação pendente, processar afiliação
        if (pendingAffiliateCode) {
          console.log('[AuthStore] Processando afiliação para novo usuário Google com código:', pendingAffiliateCode);
          try {
            await affiliateToUser(googleUser.uid, pendingAffiliateCode, false);
            // Limpar código após processamento
            localStorage.removeItem('pendingAffiliateCode');
          } catch (affiliateError) {
            console.error('[AuthStore] Erro ao processar afiliação:', affiliateError);
            // Não interromper o fluxo por falha na afiliação
          }
        }
      }
      
      // Buscar dados do usuário do Firestore
      await fetchUserData();
      
      // Redirecionar após login
      if (router) {
        router.push(redirectPath);
      }

      return true; // Indicar sucesso
      
    } catch (err: any) {
      console.error('Erro ao fazer login com Google:', err);
      
      // Tratamento específico para erro de popup fechado
      if (err.code === 'auth/popup-closed-by-user') {
        error.value = 'Login cancelado. A janela de autenticação foi fechada antes de concluir.';
        return false; // Retornar false para indicar que o usuário cancelou
      } else if (err.code === 'auth/popup-blocked') {
        error.value = 'O popup foi bloqueado pelo navegador. Verifique suas configurações de popup ou tente novamente.';
        return false;
      } else {
        error.value = err.message || 'Ocorreu um erro ao fazer login com o Google.';
        throw err; // Propagar outros erros para tratamento adicional
      }
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

  // Registro de novo usuário modificado para processar afiliação e incluir username
  const register = async (email: string, password: string, userData: { 
    displayName: string;
    username?: string; // Tornar username opcional para compatibilidade
    congregation?: string;
  }) => {
    loading.value = true;
    error.value = null;
    
    try {
      // Verificar se existe um código de afiliação pendente
      const pendingAffiliateCode = localStorage.getItem('pendingAffiliateCode');
      console.log('[AuthStore] Iniciando registro com código de afiliação pendente:', pendingAffiliateCode);
      
      // Criar o usuário no Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Atualizar o perfil do usuário
      await updateProfile(user, {
        displayName: userData.displayName
      });
      
      // Salvar dados adicionais no Firestore, incluindo username se fornecido
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        displayName: userData.displayName,
        email: email,
        username: userData.username || userData.displayName.toLowerCase().replace(/\s+/g, '_'), // Usar username fornecido ou gerar a partir do displayName
        role: UserRole.USER,
        congregation: userData.congregation || '',
        createdAt: serverTimestamp(),
      });
      
      // Se tiver código de afiliação pendente, processar afiliação
      if (pendingAffiliateCode) {
        console.log('[AuthStore] Processando afiliação para novo usuário com código:', pendingAffiliateCode);
        try {
          // Processar afiliação e AGUARDAR o resultado
          const affiliationResult = await affiliateToUser(user.uid, pendingAffiliateCode, false);
          
          // Verificar se a afiliação foi bem-sucedida
          if (affiliationResult.success) {
            console.log('[AuthStore] Afiliação processada com sucesso:', affiliationResult);
            // Limpar código APENAS após processamento bem-sucedido
            localStorage.removeItem('pendingAffiliateCode');
          } else {
            console.error('[AuthStore] Erro na afiliação:', affiliationResult.message);
            // Manter o código no localStorage para permitir nova tentativa
          }
        } catch (affiliateError) {
          console.error('[AuthStore] Exceção ao processar afiliação:', affiliateError);
          // Não interromper o fluxo por falha na afiliação
        }
      }
      
      // Buscar dados completos
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

  // Busca dados do usuário no Firestore
  const fetchUserData = async (): Promise<void> => {
    if (!firebaseUser.value) return;
    
    try {
      console.log('[AuthStore] Buscando dados do usuário:', firebaseUser.value.uid);
      const userId = firebaseUser.value.uid;
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Converter todos os timestamps no objeto usando a função utilitária
        const processedData = convertTimestampsInObject(userData);
        
        // IMPORTANTE: Preservar referência a firebaseUser antes de atualizar currentUser
        const currentFirebaseUser = firebaseUser.value;
        
        // Atualizar o usuário com todos os dados, incluindo datas convertidas corretamente
        currentUser.value = {
          ...processedData,
          id: currentFirebaseUser.uid,
        } as User;
        
        console.log('[AuthStore] Dados do usuário atualizados com sucesso');
      } else {
        console.warn('[AuthStore] Documento do usuário não encontrado no Firestore');
        // CORREÇÃO: Não definir currentUser como null, isso evita logout indesejado
        // Mantém os dados básicos do Firebase Auth
        if (currentUser.value === null && firebaseUser.value) {
          currentUser.value = {
            id: firebaseUser.value.uid,
            email: firebaseUser.value.email || '',
            displayName: firebaseUser.value.displayName || 'Usuário',
            username: '',
            role: UserRole.USER,
            createdAt: new Date()
          } as User;
        }
        error.value = 'Dados completos do usuário não encontrados.';
      }
    } catch (err) {
      console.error('[AuthStore] Erro ao buscar dados do usuário:', err);
      error.value = 'Erro ao carregar dados do usuário.';
      // CORREÇÃO: Não modificar o currentUser em caso de erro
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
        // CORREÇÃO: Não devemos definir currentUser como null em caso de erro
        // Isso poderia causar logout indesejado
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
    register,
    fetchUserData,
    initAuthListener,
    init,
    cleanup,
    loginWithGoogle // Exportando novo método
  };
});
