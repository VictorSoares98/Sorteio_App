import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/authStore';
import type { User, AffiliationResponse } from '../types/user';
import * as profileService from '../services/profile';

export function useAffiliateCode() {
  const authStore = useAuthStore();
  const loading = ref(false);
  const error = ref<string | null>(null);
  const success = ref<string | null>(null);
  const affiliatedUsers = ref<User[]>([]);
  const affiliatedToUser = ref<User | null>(null);
  
  const currentUser = computed<User | null>(() => authStore.currentUser);
  
  const codeExpiry = computed(() => {
    if (!currentUser.value?.affiliateCodeExpiry) return null;
    
    // Verificar se temos um Timestamp do Firebase ou uma Date normal
    const expiry = currentUser.value.affiliateCodeExpiry;
    return 'toDate' in expiry && typeof expiry.toDate === 'function'
      ? expiry.toDate()
      : expiry;
  });
  
  // Gerar código temporário de afiliado
  const generateTemporaryAffiliateCode = async () => {
    if (!currentUser.value) {
      error.value = 'Usuário não está autenticado.';
      return null;
    }
    
    loading.value = true;
    error.value = null;
    success.value = null;
    
    try {
      console.log('[useAffiliateCode] Gerando código temporário');
      const code = await profileService.generateTemporaryAffiliateCode(currentUser.value.id);
      
      if (!code) {
        throw new Error('Não foi possível gerar o código temporário.');
      }
      
      // MELHORIA: Atualização segura de dados com timeout
      console.log('[useAffiliateCode] Código gerado, atualizando dados do usuário');
      try {
        setTimeout(async () => {
          try {
            await authStore.fetchUserData();
            console.log('[useAffiliateCode] Dados atualizados após geração do código');
          } catch (refreshError) {
            console.error('[useAffiliateCode] Erro ao atualizar dados após gerar código:', refreshError);
          }
        }, 500);
      } catch (updateError) {
        console.warn('[useAffiliateCode] Erro ao atualizar dados do usuário, mas código foi gerado:', updateError);
      }
      
      success.value = 'Código temporário gerado com sucesso! Este código expira em 30 minutos.';
      return code;
    } catch (err: any) {
      console.error('[useAffiliateCode] Erro ao gerar código temporário:', err);
      error.value = err.message || 'Erro ao gerar código temporário.';
      return null;
    } finally {
      loading.value = false;
    }
  };
  
  // Afiliar-se a outro usuário
  const affiliateToUser = async (targetIdentifier: string, isEmail: boolean = false): Promise<AffiliationResponse | null> => {
    if (!currentUser.value) {
      error.value = 'Usuário não está autenticado.';
      return null;
    }
    
    loading.value = true;
    error.value = null;
    success.value = null;
    
    try {
      console.log('[useAffiliateCode] Iniciando processo de afiliação');
      const response = await profileService.affiliateToUser(
        currentUser.value.id,
        targetIdentifier,
        isEmail
      );
      
      if (response.success) {
        console.log('[useAffiliateCode] Afiliação bem-sucedida, atualizando dados do usuário');
        
        try {
          // MELHORIA: Usar um timeout para permitir que o Firestore conclua sua sincronização
          // antes de buscar os dados atualizados
          setTimeout(async () => {
            try {
              await authStore.fetchUserData();
              console.log('[useAffiliateCode] Dados do usuário atualizados após afiliação');
            } catch (refreshError) {
              console.error('[useAffiliateCode] Erro ao atualizar dados após afiliação:', refreshError);
            }
          }, 500);
          
          success.value = response.message;
        } catch (updateError) {
          console.warn('[useAffiliateCode] Erro ao atualizar dados do usuário, mas afiliação foi bem-sucedida:', updateError);
          // Mesmo com erro na atualização, consideramos a afiliação bem-sucedida
          success.value = response.message + ' (Recarregue a página para ver as atualizações.)';
        }
      } else {
        console.warn('[useAffiliateCode] Afiliação falhou:', response.message);
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
  
  // Buscar usuários afiliados a mim
  const fetchAffiliatedUsers = async () => {
    if (!currentUser.value) {
      error.value = 'Usuário não está autenticado.';
      return;
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      console.log('[useAffiliateCode] Buscando afiliados para:', currentUser.value.id);
      const users = await profileService.getAffiliatedUsers(currentUser.value.id);
      console.log('[useAffiliateCode] Afiliados encontrados:', users.length);
      affiliatedUsers.value = users;
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
      return await profileService.findUserByAffiliateCode(code);
    } catch (err: any) {
      console.error('Erro ao verificar código de afiliado:', err);
      error.value = err.message || 'Erro ao verificar código de afiliado.';
      return null;
    } finally {
      loading.value = false;
    }
  };
  
  return {
    currentUser,
    loading,
    error,
    success,
    affiliatedUsers,
    affiliatedToUser,
    generateTemporaryAffiliateCode,
    affiliateToUser: affiliateToUser, // Para evitar conflito de nome
    fetchAffiliatedUsers,
    checkAffiliateCode,
    codeExpiry
  };
}
