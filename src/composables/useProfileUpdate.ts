import { ref, computed } from 'vue';
import { updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../types/user';
import { safeUpdate } from '../utils/safeUpdate';
import { compressImage, isWithinSizeLimit } from '../utils/imageCompression';

export function useProfileUpdate() {
  const authStore = useAuthStore();
  const loading = ref(false);
  const error = ref<string | null>(null);
  const updateSuccess = ref(false);
  
  // Novos estados para foto de perfil
  const photoPreview = ref<string | null>(null);
  const photoFile = ref<File | null>(null);
  const photoLoading = ref(false);
  const photoError = ref<string | null>(null);
  const removePhoto = ref(false);
  
  // Nova métrica para tamanho de imagem comprimida
  const compressedSize = ref<string | null>(null);
  const compressionRatio = ref<number | null>(null);
  
  const currentUser = computed<User | null>(() => authStore.currentUser);
  
  // Form data para edição de perfil (incluindo username)
  const profileFormData = ref<{
    displayName: string;
    username: string;
    congregation: string;
    phone: string;
    photoURL: string;
  }>({
    displayName: currentUser.value?.displayName || '',
    username: currentUser.value?.username || '',
    congregation: currentUser.value?.congregation || '',
    phone: currentUser.value?.phone || '',
    photoURL: currentUser.value?.photoURL || ''
  });
  
  // Inicializar form data quando o usuário estiver disponível
  const initProfileForm = () => {
    if (currentUser.value) {
      profileFormData.value = {
        displayName: currentUser.value.displayName || '',
        username: currentUser.value.username || '',
        congregation: currentUser.value.congregation || '',
        phone: currentUser.value.phone || '',
        photoURL: currentUser.value.photoURL || ''
      };
      
      // Resetar estados da foto
      photoPreview.value = null;
      photoFile.value = null;
      removePhoto.value = false;
      photoError.value = null;
      compressedSize.value = null;
      compressionRatio.value = null;
    }
  };
  
  // Manipular seleção de arquivo
  const handleFileSelection = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    
    if (!input.files || input.files.length === 0) {
      return;
    }
    
    const file = input.files[0];
    
    // Validar tipo de arquivo (somente imagens)
    if (!file.type.startsWith('image/')) {
      photoError.value = 'Apenas arquivos de imagem são permitidos';
      return;
    }
    
    // Tamanho máximo do arquivo original (2MB)
    const maxOriginalSize = 2 * 1024 * 1024; // 2MB em bytes
    if (file.size > maxOriginalSize) {
      photoError.value = 'A imagem deve ter no máximo 2MB';
      return;
    }
    
    photoFile.value = file;
    await createCompressedPreview(file);
  };
  
  // Criar prévia da imagem com compressão
  const createCompressedPreview = async (file: File) => {
    photoLoading.value = true;
    photoError.value = null;
    
    try {
      // Primeiro, tentar com qualidade alta
      let compressedImage = await compressImage(file, 800, 0.8);
      
      // Se ainda estiver acima do limite, comprimir mais
      if (!isWithinSizeLimit(compressedImage, 500)) {
        compressedImage = await compressImage(file, 600, 0.6);
      }
      
      // Se ainda for muito grande, tentar compressão extrema
      if (!isWithinSizeLimit(compressedImage, 500)) {
        compressedImage = await compressImage(file, 400, 0.4);
      }
      
      // Atualizar prévia com a imagem comprimida
      photoPreview.value = compressedImage;
      
      // Calcular e exibir estatísticas de compressão
      const originalSize = file.size / 1024; // KB
      const newSize = (compressedImage.length * 0.75) / 1024; // Estimativa do tamanho base64 em KB
      
      compressedSize.value = `${newSize.toFixed(1)}KB`;
      compressionRatio.value = Math.round((1 - (newSize / originalSize)) * 100);
      
    } catch (err) {
      console.error('Erro ao comprimir imagem:', err);
      photoError.value = 'Erro ao processar a imagem. Tente outra imagem.';
    } finally {
      photoLoading.value = false;
    }
  };
  
  // Remover foto
  const clearPhoto = () => {
    photoFile.value = null;
    photoPreview.value = null;
    removePhoto.value = true;
    compressedSize.value = null;
    compressionRatio.value = null;
  };
  
  // Cancelar operação com foto
  const cancelPhotoChange = () => {
    photoFile.value = null;
    photoPreview.value = null;
    removePhoto.value = false;
    photoError.value = null;
    compressedSize.value = null;
    compressionRatio.value = null;
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
      // Preparar dados para atualização no Firestore
      const updateData: any = {
        displayName: profileFormData.value.displayName,
        username: profileFormData.value.username,
        congregation: profileFormData.value.congregation,
        phone: profileFormData.value.phone
      };
      
      // Processar foto de perfil
      if (removePhoto.value) {
        // Se a foto for removida, definir photoURL como vazio
        updateData.photoURL = '';
      } else if (photoFile.value && photoPreview.value) {
        // Se houver uma nova foto, usar a prévia comprimida como base64 (apenas para Firestore)
        updateData.photoURL = photoPreview.value;
      }
      
      // Atualizar Auth com displayName e uma URL curta para foto
      // Para evitar o erro "Photo URL too long"
      await updateProfile(auth.currentUser, {
        displayName: profileFormData.value.displayName,
        // Use uma URL curta para o Auth - a imagem real fica só no Firestore
        photoURL: removePhoto.value 
          ? '' 
          : auth.currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profileFormData.value.displayName)}`
      });
      
      // Atualizar Firestore com todos os dados, incluindo a imagem em base64 quando disponível
      const success = await safeUpdate(
        'users', 
        currentUser.value.id,
        updateData,
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
        
        // Resetar estados da foto
        photoFile.value = null;
        photoPreview.value = null;
        removePhoto.value = false;
        compressedSize.value = null;
        compressionRatio.value = null;
        
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
    updateUserProfile,
    
    // Novas funções para manipulação de fotos
    photoPreview,
    photoFile,
    photoLoading,
    photoError,
    handleFileSelection,
    clearPhoto,
    cancelPhotoChange,
    removePhoto,
    
    // Informações de compressão
    compressedSize,
    compressionRatio
  };
}
