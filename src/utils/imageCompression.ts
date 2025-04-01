/**
 * Utilitário para compressão de imagens no navegador
 * Implementado nativamente sem dependências externas
 */

/**
 * Comprime uma imagem para o tamanho e qualidade especificados
 * @param file Arquivo de imagem original
 * @param maxWidthOrHeight Dimensão máxima (largura ou altura) da imagem resultante
 * @param quality Qualidade da imagem (0-1), onde 1 é máxima qualidade
 * @returns Promise com o resultado em base64
 */
export const compressImage = async (
  file: File,
  maxWidthOrHeight: number = 800,
  quality: number = 0.7
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Criar um elemento de imagem para carregar o arquivo
    const img = new Image();
    const reader = new FileReader();
    
    // Quando o arquivo for carregado como URL de dados
    reader.onload = (e) => {
      img.src = e.target?.result as string;
      
      // Quando a imagem for carregada
      img.onload = () => {
        // Calcular as novas dimensões mantendo a proporção
        let width = img.width;
        let height = img.height;
        
        if (width > height && width > maxWidthOrHeight) {
          height = Math.round((height * maxWidthOrHeight) / width);
          width = maxWidthOrHeight;
        } else if (height > maxWidthOrHeight) {
          width = Math.round((width * maxWidthOrHeight) / height);
          height = maxWidthOrHeight;
        }
        
        // Criar canvas para desenhar a imagem redimensionada
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Desenhar a imagem no canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível obter o contexto do canvas'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Converter para base64 com a qualidade especificada
        const dataUrl = canvas.toDataURL(file.type, quality);
        
        // Resolver com o resultado em base64
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Erro ao carregar a imagem'));
      };
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo'));
    };
    
    // Iniciar a leitura do arquivo como URL de dados
    reader.readAsDataURL(file);
  });
};

/**
 * Estima o tamanho da string base64 em bytes
 * @param base64String String base64 da imagem
 * @returns Tamanho aproximado em bytes
 */
export const estimateBase64Size = (base64String: string): number => {
  // Remover o cabeçalho (por exemplo, 'data:image/jpeg;base64,')
  const base64 = base64String.split(',')[1];
  
  // Cada caractere base64 representa 6 bits, então 4 caracteres representam 3 bytes
  // Para calcular o tamanho: (tamanho_da_string * 3) / 4
  return Math.ceil((base64.length * 3) / 4);
};

/**
 * Verifica se uma imagem base64 está dentro do limite de tamanho
 * @param base64String String base64 da imagem
 * @param maxSizeKB Tamanho máximo em KB
 * @returns Boolean indicando se está dentro do limite
 */
export const isWithinSizeLimit = (base64String: string, maxSizeKB: number): boolean => {
  const sizeInBytes = estimateBase64Size(base64String);
  return sizeInBytes <= maxSizeKB * 1024;
};
