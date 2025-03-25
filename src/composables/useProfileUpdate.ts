import { ref, computed } from 'vue';
import { updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../types/user';
import { safeUpdate } from '../utils/safeUpdate';

export function useProfileUpdate() {
  const authStore = useAuthStore();
  const loading = ref(false);
  const error = ref<string | null>(null);
  const updateSuccess = ref(false);
  
  const currentUser = computed<User | null>(() => authStore.currentUser);
  
  // Form data para edição de perfil (incluindo username)
  const profileFormData = ref<{
    displayName: string;
    username: string;
    congregation: string;
    phone: string;
  }>({
    displayName: currentUser.value?.displayName || '',
    username: currentUser.value?.username || '',
    congregation: currentUser.value?.congregation || '',
    phone: currentUser.value?.phone || ''
  });
  
  // Inicializar form data quando o usuário estiver disponível
  const initProfileForm = () => {
    if (currentUser.value) {
      profileFormData.value = {
        displayName: currentUser.value.displayName || '',
        username: currentUser.value.username || '',
        congregation: currentUser.value.congregation || '',
        phone: currentUser.value.phone || ''
      };
    }
  };
  
  // Salvar mudanças no perfil
  const updateUserProfile = async () => {
    if (!currentUser.value || !auth.currentUser) {
      error.value = 'Usuário não está autenticado.';
      return false;
    }
    
    loading.value = true;
    error.value = null;
    updateSuccess.value = false;
    
    try {
      // Atualizar displayName no Auth
      await updateProfile(auth.currentUser, {
        displayName: profileFormData.value.displayName
      });
      
      // MODIFICADO: Usar safeUpdate para maior resiliência ao atualizar dados
      const success = await safeUpdate(
        'users', 
        currentUser.value.id,
        {
          displayName: profileFormData.value.displayName,
          username: profileFormData.value.username,
          congregation: profileFormData.value.congregation,
          phone: profileFormData.value.phone
        },
        {
          maxRetries: 3,
          onError: (err) => {
            console.error('Erro ao atualizar perfil após tentativas:', err);
            error.value = 'Erro ao atualizar perfil após múltiplas tentativas. Tente novamente mais tarde.';
          }
        }
      );
      
      if (success) {
        // Atualizar store local
        await authStore.fetchUserData();
        updateSuccess.value = true;
        return true;
      } else {
        return false;
      }
    } catch (err: any) {
      console.error('Erro ao atualizar perfil:', err);
      error.value = err.message || 'Erro ao atualizar perfil. Tente novamente.';
      return false;
    } finally {
      loading.value = false;
    }
  };

  return {
    currentUser,
    profileFormData,
    loading,
    error,
    updateSuccess,
    initProfileForm,
    updateUserProfile
  };
}
