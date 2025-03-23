import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../types/user';
import * as profileService from '../services/profile';

export function useAffiliateCode() {
  const authStore = useAuthStore();
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  const currentUser = computed<User | null>(() => authStore.currentUser);
  
  // Gerar ou atualizar código de afiliado
  const generateAffiliateCode = async () => {
    if (!currentUser.value) {
      error.value = 'Usuário não está autenticado.';
      return null;
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      const code = await profileService.generateAffiliateCode(currentUser.value.id);
      if (!code) {
        throw new Error('Não foi possível gerar o código de afiliado.');
      }
      // Atualizar store para refletir novo código
      await authStore.fetchUserData();
      return code;
    } catch (err: any) {
      console.error('Erro ao gerar código de afiliado:', err);
      error.value = err.message || 'Erro ao gerar código de afiliado.';
      return null;
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
    generateAffiliateCode,
    checkAffiliateCode
  };
}
