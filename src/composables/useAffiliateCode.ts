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
      const code = await profileService.generateTemporaryAffiliateCode(currentUser.value.id);
      if (!code) {
        throw new Error('Não foi possível gerar o código temporário.');
      }
      // Atualizar store para refletir novo código
      await authStore.fetchUserData();
      success.value = 'Código temporário gerado com sucesso! Este código expira em 30 minutos.';
      return code;
    } catch (err: any) {
      console.error('Erro ao gerar código temporário:', err);
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
      const response = await profileService.affiliateToUser(
        currentUser.value.id,
        targetIdentifier,
        isEmail
      );
      
      if (response.success) {
        // Atualizar store para refletir mudanças
        await authStore.fetchUserData();
        success.value = response.message;
      } else {
        error.value = response.message;
      }
      
      return response;
    } catch (err: any) {
      console.error('Erro ao afiliar-se:', err);
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
      const users = await profileService.getAffiliatedUsers(currentUser.value.id);
      affiliatedUsers.value = users;
    } catch (err: any) {
      console.error('Erro ao buscar afiliados:', err);
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
