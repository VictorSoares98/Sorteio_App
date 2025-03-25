import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/authStore';
import type { User, AffiliationResponse } from '../types/user';
import * as profileService from '../services/profile';
import { timestampToDate } from '../utils/firebaseUtils';

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
    
    // Usando a função utilitária para converter timestamp
    return timestampToDate(currentUser.value.affiliateCodeExpiry);
  });
  
  const timeRemaining = computed(() => {
    if (!codeExpiry.value) return '';
    
    const now = new Date();
    const diffMs = codeExpiry.value.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / 60000);
    
    if (diffMinutes <= 0) return 'Expirado';
    return `${diffMinutes} min restantes`;
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
      // Usar diretamente o serviço sem reimplementar a lógica
      const code = await profileService.generateTemporaryAffiliateCode(currentUser.value.id);
      
      if (!code) {
        throw new Error('Não foi possível gerar o código temporário.');
      }
      
      // Atualização segura com timeout
      setTimeout(async () => {
        try {
          await authStore.fetchUserData();
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
    }
  };
  
  // Afiliar-se a outro usuário - simplificado para usar diretamente o serviço
  const affiliateToUserMethod = async (targetIdentifier: string, isEmail: boolean = false): Promise<AffiliationResponse | null> => {
    if (!currentUser.value) {
      error.value = 'Usuário não está autenticado.';
      return null;
    }
    
    loading.value = true;
    error.value = null;
    success.value = null;
    
    try {
      console.log('[useAffiliateCode] Iniciando processo de afiliação');
      // Usar diretamente o serviço sem reimplementar a lógica
      const response = await profileService.affiliateToUser(
        currentUser.value.id,
        targetIdentifier,
        isEmail
      );
      
      if (response.success) {
        console.log('[useAffiliateCode] Afiliação bem-sucedida');
        // Atualização segura com timeout
        setTimeout(async () => {
          await authStore.fetchUserData();
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
  
  // Função para buscar usuários afiliados
  const fetchAffiliatedUsers = async () => {
    if (!currentUser.value) {
      error.value = 'Usuário não está autenticado.';
      return;
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      console.log('[useAffiliateCode] Buscando afiliados');
      // Usar diretamente o serviço sem reimplementar a lógica
      affiliatedUsers.value = await profileService.getAffiliatedUsers(currentUser.value.id);
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
  
  return {
    currentUser,
    loading,
    error,
    success,
    affiliatedUsers,
    affiliatedToUser,
    generateTemporaryAffiliateCode,
    affiliateToUser: affiliateToUserMethod, // Renomeado para evitar conflito
    fetchAffiliatedUsers,
    checkAffiliateCode,
    codeExpiry,
    timeRemaining
  };
}
