import { ref } from 'vue';
import { imageToBase64 } from '../services/raffle';

export function useImageProcessing() {
  const imageLoading = ref(false);
  const imageError = ref<string | null>(null);

  // Lista de formatos de imagem suportados
  const supportedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
  
  // Tamanho máximo de arquivo (2MB)
  const MAX_SIZE = 2 * 1024 * 1024;

  /**
   * Processa uma imagem selecionada pelo usuário
   * Valida o formato e tamanho e converte para base64
   */
  const processImage = async (file: File): Promise<string | null> => {
    if (!file) return null;
    
    // Limpar erros anteriores
    imageError.value = null;
    
    // Verificar tipo de arquivo
    if (!supportedFormats.includes(file.type)) {
      imageError.value = 'Formato de imagem não suportado. Use JPEG, PNG, GIF, WEBP, SVG ou BMP.';
      return null;
    }
    
    // Verificar tamanho do arquivo
    if (file.size > MAX_SIZE) {
      imageError.value = 'A imagem deve ter menos de 2MB.';
      return null;
    }
    
    try {
      imageLoading.value = true;
      
      // Converter para base64 usando o serviço
      const base64Image = await imageToBase64(file);
      return base64Image;
      
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      imageError.value = 'Não foi possível processar a imagem. Tente novamente.';
      return null;
    } finally {
      imageLoading.value = false;
    }
  };
  
  /**
   * Validação de um arquivo de imagem
   * Retorna objeto com status e mensagem de erro
   */
  const validateImage = (file: File): { isValid: boolean; errorMessage?: string } => {
    if (!supportedFormats.includes(file.type)) {
      return { 
        isValid: false, 
        errorMessage: 'Formato de imagem não suportado. Use JPEG, PNG, GIF, WEBP, SVG ou BMP.' 
      };
    }
    
    if (file.size > MAX_SIZE) {
      return { 
        isValid: false, 
        errorMessage: 'A imagem deve ter menos de 2MB.' 
      };
    }
    
    return { isValid: true };
  };

  return {
    imageLoading,
    imageError,
    processImage,
    validateImage,
    supportedFormats,
    MAX_SIZE
  };
}
