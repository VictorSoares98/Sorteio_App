// Serviço para upload de imagens usando Cloudinary sem backend

// Cloudinary - Preset não assinado (configurar no dashboard Cloudinary)
const CLOUDINARY_UPLOAD_PRESET = 'sorteio_umadrimc_unsigned';
const CLOUDINARY_CLOUD_NAME = 'seu-cloud-name';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  try {
    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Erro ao fazer upload da imagem');
    }

    const data = await response.json();
    return data.secure_url; // URL otimizada e segura da imagem
  } catch (error) {
    console.error('Erro no upload:', error);
    throw new Error('Não foi possível fazer o upload da imagem');
  }
}
