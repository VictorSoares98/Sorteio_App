import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/authStore';
import type { User, AffiliationResponse } from '../types/user';
import { timestampToDate } from '../utils/firebaseUtils';
import { UserRole } from '../types/user';

export function useAffiliateCode() {
  const authStore = useAuthStore();
  const loading = ref(false);
  const error = ref<string | null>(null);
  const success = ref<string | null>(null);
  const affiliatedUsers = ref<User[]>([]);
  const affiliatedToUser = ref<User | null>(null);
  
  // Estados para código de afiliação
  const isGeneratingCode = ref(false);
  const isCodeValid = ref(false);
  
  const currentUser = computed<User | null>(() => authStore.currentUser);
  
  // Computar validade do código
  const codeExpiry = computed(() => {
    if (!currentUser.value?.affiliateCodeExpiry) return null;
    
    // Usando a função utilitária para converter timestamp
    return timestampToDate(currentUser.value.affiliateCodeExpiry);
  });
  
  // Computar tempo restante de forma mais legível
  const timeRemaining = computed(() => {
    if (!codeExpiry.value) return '';
    
    const now = new Date();
    const diffMs = codeExpiry.value.getTime() - now.getTime();
    
    // Se expirado
    if (diffMs <= 0) return 'Expirado';
    
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffSeconds = Math.floor((diffMs % 60000) / 1000);
    
    // Formatar como MM:SS se menos de 10 minutos
    if (diffMinutes < 10) {
      return `${diffMinutes}:${diffSeconds.toString().padStart(2, '0')} restantes`;
    }
    // Caso contrário, mostrar apenas minutos
    return `${diffMinutes} min restantes`;
  });
  
  // Variável para controlar os timeouts de mensagens
  const messageTimeouts = ref<Record<string, number>>({});

  // Verificar código atual com melhor tratamento de expiração
  const checkCurrentCode = () => {
    if (!currentUser.value?.affiliateCode) {
      isCodeValid.value = false;
      return;
    }
    
    if (codeExpiry.value) {
      const now = new Date();
      const isExpired = codeExpiry.value < now;
      
      isCodeValid.value = !isExpired;
    } else {
      // Se não tem expiração, o código é permanente
      isCodeValid.value = true;
    }
  };

  // Funções centralizadas para gerenciar mensagens temporárias
  const setTemporaryError = (message: string, duration: number = 8000) => {
    error.value = message;
    
    // Limpar timeout anterior se existir
    if (messageTimeouts.value['error']) {
      clearTimeout(messageTimeouts.value['error']);
    }
    
    // Definir novo timeout
    messageTimeouts.value['error'] = window.setTimeout(() => {
      if (error.value === message) {
        error.value = null;
      }
      messageTimeouts.value['error'] = 0;
    }, duration);
  };

  const setTemporarySuccess = (message: string, duration: number = 8000) => {
    success.value = message;
    
    // Limpar timeout anterior se existir
    if (messageTimeouts.value['success']) {
      clearTimeout(messageTimeouts.value['success']);
    }
    
    // Definir novo timeout
    messageTimeouts.value['success'] = window.setTimeout(() => {
      if (success.value === message) {
        success.value = null;
      }
      messageTimeouts.value['success'] = 0;
    }, duration);
  };

  // Verificar código de afiliado com validação aprimorada
  const checkAffiliateCode = async (code: string): Promise<User | null> => {
    if (!code) return null;
    
    loading.value = true;
    error.value = null;
    
    try {
      // Importação dinâmica
      const { findUserByAffiliateCode } = await import('../services/profile');
      
      // Primeiro, verificar se o código é válido em termos de formato
      if (!/^[A-Za-z0-9]{6}$/.test(code)) {
        setTemporaryError('Código de afiliado inválido. Deve ter 6 caracteres alfanuméricos.');
        return null;
      }
      
      // Buscar usuário pelo código
      const user = await findUserByAffiliateCode(code);
      
      // Se não encontrou usuário, código não existe
      if (!user) {
        setTemporaryError('Código de afiliado não encontrado ou inválido.');
        return null;
      }
      
      // Verificar se o código está expirado
      if (user.affiliateCodeExpiry) {
        const expiryDate = timestampToDate(user.affiliateCodeExpiry);
        const now = new Date();
        
        if (expiryDate < now) {
          setTemporaryError('Este código de afiliado expirou. Peça um novo código para o usuário.');
          return null;
        }
      }
      
      return user;
    } catch (err: any) {
      console.error('[useAffiliateCode] Erro ao verificar código:', err);
      setTemporaryError(err.message || 'Erro ao verificar código de afiliado.');
      return null;
    } finally {
      loading.value = false;
    }
  };

  // Gerar código temporário de afiliado com retentativas e feedback temporário
  const generateTemporaryAffiliateCode = async () => {
    if (!currentUser.value) {
      setTemporaryError('Usuário não está autenticado.');
      return null;
    }
    
    loading.value = true;
    error.value = null;
    success.value = null;
    isGeneratingCode.value = true;
    
    try {
      console.log('[useAffiliateCode] Gerando código temporário');
      
      // Importação dinâmica
      const { generateTemporaryAffiliateCode } = await import('../services/profile');
      
      // Usar diretamente o serviço sem reimplementar a lógica
      const code = await generateTemporaryAffiliateCode(currentUser.value.id);
      
      if (!code) {
        throw new Error('Não foi possível gerar o código temporário.');
      }
      
      // Atualização com timeout para permitir propagação dos dados
      setTimeout(async () => {
        try {
          await authStore.fetchUserData();
          // Verificar validade do código após atualização
          checkCurrentCode();
          console.log('[useAffiliateCode] Dados atualizados após geração do código');
        } catch (refreshError) {
          console.error('[useAffiliateCode] Erro ao atualizar dados após gerar código:', refreshError);
        }
      }, 500);
      
      setTemporarySuccess('Código temporário gerado com sucesso! Este código expira em 30 minutos.');
      
      return code;
    } catch (err: any) {
      console.error('[useAffiliateCode] Erro ao gerar código temporário:', err);
      setTemporaryError(err.message || 'Erro ao gerar código temporário.');
      return null;
    } finally {
      loading.value = false;
      isGeneratingCode.value = false;
    }
  };

  // Afiliar-se a outro usuário com validação melhorada e feedback temporário
  const affiliateToUserMethod = async (targetIdentifier: string, isEmail: boolean = false): Promise<AffiliationResponse | null> => {
    if (!currentUser.value) {
      setTemporaryError('Usuário não está autenticado.');
      return null;
    }
    
    // NOVAS REGRAS - Verificar restrições antes de prosseguir
    if (currentUser.value.affiliatedTo) {
      setTemporaryError('Você já está afiliado a outro usuário e não pode mudar sua afiliação.');
      return {
        success: false,
        message: error.value || 'Erro desconhecido'
      };
    }
    
    if (currentUser.value.affiliates && currentUser.value.affiliates.length > 0) {
      setTemporaryError('Como você já possui afiliados, não é possível se afiliar a outro usuário.');
      return {
        success: false,
        message: error.value || 'Erro desconhecido'
      };
    }
    
    const normalizedIdentifier = isEmail ? targetIdentifier : targetIdentifier.toUpperCase();
    
    if (!isEmail && !/^[A-Za-z0-9]{6}$/.test(normalizedIdentifier)) {
      setTemporaryError('Código de afiliado deve ter 6 caracteres alfanuméricos.');
      return null;
    }
    
    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier)) {
      setTemporaryError('Por favor, informe um email válido.');
      return null;
    }
    
    loading.value = true;
    error.value = null;
    success.value = null;
    
    try {
      console.log('[useAffiliateCode] Iniciando processo de afiliação');
      const { affiliateToUser } = await import('../services/profile');
      
      let response = await affiliateToUser(
        currentUser.value.id,
        normalizedIdentifier,
        isEmail
      );
      
      if (!response.success && 
          (response.message.includes('transação') || 
           response.message.includes('temporariamente'))) {
        
        console.log('[useAffiliateCode] Primeira tentativa falhou, tentando novamente...');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        response = await affiliateToUser(
          currentUser.value.id,
          targetIdentifier,
          isEmail
        );
      }
      
      if (response.success) {
        console.log('[useAffiliateCode] Afiliação bem-sucedida');
        sessionStorage.setItem('newAffiliation', 'true');
        
        setTimeout(async () => {
          await authStore.fetchUserData();
          await fetchAffiliatedUsers();
        }, 500);
        
        setTemporarySuccess(response.message);
      } else {
        setTemporaryError(response.message);
      }
      
      return response;
    } catch (err: any) {
      console.error('[useAffiliateCode] Erro ao afiliar-se:', err);
      setTemporaryError(err.message || 'Erro ao processar a afiliação.');
      return null;
    } finally {
      loading.value = false;
    }
  };

  // Função para buscar usuários afiliados com paginação
  const fetchAffiliatedUsers = async () => {
    if (!currentUser.value) {
      setTemporaryError('Usuário não está autenticado.');
      return;
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      console.log('[useAffiliateCode] Buscando afiliados');
      const { getAffiliatedUsers } = await import('../services/profile');
      
      affiliatedUsers.value = await getAffiliatedUsers(currentUser.value.id);
      
      if (authStore.currentUser && affiliatedUsers.value.length > 0) {
        setTimeout(() => {
          checkCurrentCode();
        }, 500);
      }
    } catch (err: any) {
      console.error('[useAffiliateCode] Erro ao buscar afiliados:', err);
      setTemporaryError(err.message || 'Erro ao buscar usuários afiliados.');
    } finally {
      loading.value = false;
    }
  };

  // Modificar o removeAffiliate para usar as funções de mensagens temporárias
  const removeAffiliate = async (affiliateId: string): Promise<AffiliationResponse> => {
    if (!currentUser.value) {
      setTemporaryError('Usuário não está autenticado.');
      return {
        success: false,
        message: 'Usuário não está autenticado.'
      };
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      const { removeAffiliate: removeAffiliateService } = await import('../services/profile');
      
      const result = await removeAffiliateService(currentUser.value.id, affiliateId);
      
      if (result.success) {
        await fetchAffiliatedUsers();
        setTemporarySuccess(result.message);
      } else {
        setTemporaryError(result.message);
      }
      
      return result;
    } catch (err: any) {
      console.error('[useAffiliateCode] Erro ao remover afiliado:', err);
      setTemporaryError(err.message || 'Erro ao remover afiliado.');
      return {
        success: false,
        message: err.message || 'Erro desconhecido'
      };
    } finally {
      loading.value = false;
    }
  };

  // Modificar o updateAffiliateRole para usar as funções de mensagens temporárias
  const updateAffiliateRole = async (
    affiliateId: string, 
    newRole: UserRole
  ): Promise<AffiliationResponse> => {
    if (!currentUser.value) {
      setTemporaryError('Usuário não está autenticado.');
      return {
        success: false,
        message: 'Usuário não está autenticado.'
      };
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      const userAffiliate = affiliatedUsers.value.find(user => user.id === affiliateId);
      if (!userAffiliate) {
        setTemporaryError('Este usuário não é mais seu afiliado ou a relação foi rompida.');
        return {
          success: false,
          message: error.value || 'Este usuário não é mais seu afiliado ou a relação foi rompida.'
        };
      }
      
      if ((newRole === UserRole.ADMIN || 
           newRole === UserRole.SECRETARIA || 
           newRole === UserRole.TESOUREIRO) && 
          (!userAffiliate.affiliatedToId || userAffiliate.affiliatedToId !== currentUser.value.id)) {
        setTemporaryError('Não é possível atribuir papel administrativo a um usuário sem afiliação válida.');
        return {
          success: false,
          message: error.value || 'Não é possível atribuir papel administrativo a um usuário sem afiliação válida.'
        };
      }
      
      if ((userAffiliate.role === UserRole.ADMIN || 
           userAffiliate.role === UserRole.SECRETARIA || 
           userAffiliate.role === UserRole.TESOUREIRO) && 
          (!userAffiliate.affiliatedToId || userAffiliate.affiliatedToId !== currentUser.value.id)) {
        newRole = UserRole.USER;
      }
      
      const { updateAffiliateRole: updateAffiliateRoleService } = await import('../services/profile');
      
      const result = await updateAffiliateRoleService(currentUser.value.id, affiliateId, newRole);
      
      if (result.success) {
        await fetchAffiliatedUsers();
        setTemporarySuccess(result.message);
      } else {
        setTemporaryError(result.message);
      }
      
      return result;
    } catch (err: any) {
      console.error('[useAffiliateCode] Erro ao atualizar papel do afiliado:', err);
      setTemporaryError(err.message || 'Erro ao atualizar papel do afiliado.');
      return {
        success: false,
        message: err.message || 'Erro desconhecido'
      };
    } finally {
      loading.value = false;
    }
  };

  // Limpar todos os timeouts ao desmontar o componente
  const clearAllTimeouts = () => {
    Object.keys(messageTimeouts.value).forEach(key => {
      if (messageTimeouts.value[key]) {
        clearTimeout(messageTimeouts.value[key]);
        messageTimeouts.value[key] = 0;
      }
    });
  };

  // Inicializar verificação de código
  checkCurrentCode();
  
  return {
    currentUser,
    loading,
    error,
    success,
    affiliatedUsers,
    affiliatedToUser,
    generateTemporaryAffiliateCode,
    affiliateToUser: affiliateToUserMethod,
    fetchAffiliatedUsers,
    codeExpiry,
    timeRemaining,
    isCodeValid,
    isGeneratingCode,
    checkCurrentCode,
    checkAffiliateCode,
    removeAffiliate,
    updateAffiliateRole,
    setTemporaryError,
    setTemporarySuccess,
    clearAllTimeouts
  };
}
