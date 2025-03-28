import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/authStore';
import type { User, AffiliationResponse } from '../types/user';
import * as profileService from '../services/profile';
import { timestampToDate } from '../utils/firebaseUtils';
import { 
  removeAffiliate as removeAffiliateService,
  updateAffiliateRole as updateAffiliateRoleService
} from '../services/profile';
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
  
  // Verificar código atual
  const checkCurrentCode = () => {
    if (!currentUser.value?.affiliateCode) {
      isCodeValid.value = false;
      return;
    }
    
    if (codeExpiry.value) {
      isCodeValid.value = codeExpiry.value > new Date();
    } else {
      // Se não tem expiração, o código é permanente
      isCodeValid.value = true;
    }
  };
  
  // Gerar código temporário de afiliado com retentativas
  const generateTemporaryAffiliateCode = async () => {
    if (!currentUser.value) {
      error.value = 'Usuário não está autenticado.';
      return null;
    }
    
    loading.value = true;
    error.value = null;
    success.value = null;
    isGeneratingCode.value = true;
    
    try {
      console.log('[useAffiliateCode] Gerando código temporário');
      
      // Usar diretamente o serviço sem reimplementar a lógica
      const code = await profileService.generateTemporaryAffiliateCode(currentUser.value.id);
      
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
      
      success.value = 'Código temporário gerado com sucesso! Este código expira em 30 minutos.';
      return code;
    } catch (err: any) {
      console.error('[useAffiliateCode] Erro ao gerar código temporário:', err);
      error.value = err.message || 'Erro ao gerar código temporário.';
      return null;
    } finally {
      loading.value = false;
      isGeneratingCode.value = false;
    }
  };
  
  // Afiliar-se a outro usuário com validação melhorada
  const affiliateToUserMethod = async (targetIdentifier: string, isEmail: boolean = false): Promise<AffiliationResponse | null> => {
    if (!currentUser.value) {
      error.value = 'Usuário não está autenticado.';
      return null;
    }
    
    // NOVAS REGRAS - Verificar restrições antes de prosseguir
    // Regra 1: Usuário já afiliado não pode se afiliar a outra pessoa
    if (currentUser.value.affiliatedTo) {
      error.value = 'Você já está afiliado a outro usuário e não pode mudar sua afiliação.';
      return {
        success: false,
        message: error.value || 'Erro desconhecido'
      };
    }
    
    // Regra 2: Usuário com afiliados não pode se afiliar a outro
    if (currentUser.value.affiliates && currentUser.value.affiliates.length > 0) {
      error.value = 'Como você já possui afiliados, não é possível se afiliar a outro usuário.';
      return {
        success: false,
        message: error.value || 'Erro desconhecido'
      };
    }
    
    // Normalizar código para maiúsculas
    const normalizedIdentifier = isEmail ? targetIdentifier : targetIdentifier.toUpperCase();
    
    // Validação básica do formato antes de enviar ao servidor
    if (!isEmail && !/^[A-Za-z0-9]{6}$/.test(normalizedIdentifier)) {
      error.value = 'Código de afiliado deve ter 6 caracteres alfanuméricos.';
      return null;
    }
    
    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier)) {
      error.value = 'Por favor, informe um email válido.';
      return null;
    }
    
    loading.value = true;
    error.value = null;
    success.value = null;
    
    try {
      console.log('[useAffiliateCode] Iniciando processo de afiliação');
      // Usar diretamente o serviço com tratamento de tentativas
      
      // Primeira tentativa (com identificador normalizado)
      let response = await profileService.affiliateToUser(
        currentUser.value.id,
        normalizedIdentifier,
        isEmail
      );
      
      // Se falhou por razões que podem ser temporárias, tentar novamente
      if (!response.success && 
          (response.message.includes('transação') || 
           response.message.includes('temporariamente'))) {
        
        console.log('[useAffiliateCode] Primeira tentativa falhou, tentando novamente...');
        
        // Esperar um pouco antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Segunda tentativa
        response = await profileService.affiliateToUser(
          currentUser.value.id,
          targetIdentifier,
          isEmail
        );
      }
      
      if (response.success) {
        console.log('[useAffiliateCode] Afiliação bem-sucedida');
        // Armazenar flag de nova afiliação para notificação na página inicial
        sessionStorage.setItem('newAffiliation', 'true');
        
        // Atualização segura com timeout
        setTimeout(async () => {
          await authStore.fetchUserData();
          await fetchAffiliatedUsers();
        }, 500);
        
        success.value = response.message;
      } else {
        error.value = response.message;
      }
      
      return response;
    } catch (err: any) {
      console.error('[useAffiliateCode] Erro ao afiliar-se:', err);
      error.value = err.message || 'Erro ao processar a afiliação.';
      return null;
    } finally {
      loading.value = false;
    }
  };
  
  // Função para buscar usuários afiliados com paginação
  const fetchAffiliatedUsers = async () => {
    if (!currentUser.value) {
      error.value = 'Usuário não está autenticado.';
      return;
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      console.log('[useAffiliateCode] Buscando afiliados');
      // Buscar afiliados diretamente do serviço
      affiliatedUsers.value = await profileService.getAffiliatedUsers(currentUser.value.id);
      
      // Atualizar a contagem de afiliados no usuário atual
      if (authStore.currentUser && affiliatedUsers.value.length > 0) {
        // Apenas atualizamos o store para refletir o número correto
        setTimeout(() => {
          checkCurrentCode();
        }, 500);
      }
    } catch (err: any) {
      console.error('[useAffiliateCode] Erro ao buscar afiliados:', err);
      error.value = err.message || 'Erro ao buscar usuários afiliados.';
    } finally {
      loading.value = false;
    }
  };
  
  // Verificar código de afiliado
  const checkAffiliateCode = async (code: string): Promise<User | null> => {
    if (!code) return null;
    
    loading.value = true;
    error.value = null;
    
    try {
      // Usar diretamente o serviço sem reimplementar a lógica
      return await profileService.findUserByAffiliateCode(code);
    } catch (err: any) {
      console.error('[useAffiliateCode] Erro ao verificar código:', err);
      error.value = err.message || 'Erro ao verificar código de afiliado.';
      return null;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * Remove um afiliado
   */
  const removeAffiliate = async (affiliateId: string): Promise<AffiliationResponse> => {
    if (!currentUser.value) {
      error.value = 'Usuário não está autenticado.';
      return {
        success: false,
        message: error.value || 'Erro desconhecido'
      };
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      const result = await removeAffiliateService(currentUser.value.id, affiliateId);
      
      if (result.success) {
        // Atualizar a lista de afiliados após remoção bem-sucedida
        await fetchAffiliatedUsers();
        success.value = result.message;
      } else {
        error.value = result.message;
      }
      
      return result;
    } catch (err: any) {
      console.error('[useAffiliateCode] Erro ao remover afiliado:', err);
      error.value = err.message || 'Erro ao remover afiliado.';
      return {
        success: false,
        message: error.value || 'Erro desconhecido'
      };
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * Atualiza o papel (role/hierarquia) de um afiliado
   */
  const updateAffiliateRole = async (
    affiliateId: string, 
    newRole: UserRole
  ): Promise<AffiliationResponse> => {
    if (!currentUser.value) {
      error.value = 'Usuário não está autenticado.';
      return {
        success: false,
        message: error.value || 'Erro desconhecido'
      };
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      const result = await updateAffiliateRoleService(currentUser.value.id, affiliateId, newRole);
      
      if (result.success) {
        // Atualizar a lista de afiliados após atualização bem-sucedida
        await fetchAffiliatedUsers();
        success.value = result.message;
      } else {
        error.value = result.message;
      }
      
      return result;
    } catch (err: any) {
      console.error('[useAffiliateCode] Erro ao atualizar papel do afiliado:', err);
      error.value = err.message || 'Erro ao atualizar papel do afiliado.';
      return {
        success: false,
        message: error.value || 'Erro desconhecido'
      };
    } finally {
      loading.value = false;
    }
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
    updateAffiliateRole
  };
}
