import { ref, computed } from 'vue';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../types/user';
import * as profileService from '../services/profile';

export function useProfileUpdate() {
  const authStore = useAuthStore();
  const loading = ref(false);
  const error = ref<string | null>(null);
  const updateSuccess = ref(false);
  
  const currentUser = computed<User | null>(() => authStore.currentUser);
  
  // Form data para edição de perfil
  const profileFormData = ref<{
    displayName: string;
    congregation: string;
    phone: string;
  }>({
    displayName: currentUser.value?.displayName || '',
    congregation: currentUser.value?.congregation || '',
    phone: currentUser.value?.phone || ''
  });
  
  // Inicializar form data quando o usuário estiver disponível
  const initProfileForm = () => {
    if (currentUser.value) {
      profileFormData.value = {
        displayName: currentUser.value.displayName || '',
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
      
      // Atualizar dados no Firestore
      const userRef = doc(db, 'users', currentUser.value.id);
      await updateDoc(userRef, {
        displayName: profileFormData.value.displayName,
        congregation: profileFormData.value.congregation,
        phone: profileFormData.value.phone
      });
      
      // Atualizar store local
      await authStore.fetchUserData();
      updateSuccess.value = true;
      
      return true;
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
