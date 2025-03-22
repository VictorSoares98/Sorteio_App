import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Gera um código de afiliado aleatório
 */
const generateRandomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Verifica se um código de afiliado já existe
 */
const checkCodeExists = async (code: string): Promise<boolean> => {
  // No mundo real, verificaríamos no Firestore se o código já existe
  // Por simplicidade, estamos sempre retornando false
  return false;
};

/**
 * Gera um código de afiliado único e o salva no perfil do usuário
 */
export const generateAffiliateCode = async (userId: string): Promise<string> => {
  try {
    // Verificar se o usuário já tem um código
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('Usuário não encontrado.');
    }
    
    const userData = userSnap.data();
    
    // Se o usuário já tem um código, retorná-lo
    if (userData.affiliateCode) {
      return userData.affiliateCode;
    }
    
    // Gerar um novo código único
    let code;
    let codeExists = true;
    
    // Tentar até encontrar um código único
    while (codeExists) {
      code = generateRandomCode();
      codeExists = await checkCodeExists(code);
    }
    
    // Salvar o código no perfil do usuário
    await updateDoc(userRef, {
      affiliateCode: code
    });
    
    return code;
  } catch (error) {
    console.error('Erro ao gerar código de afiliado:', error);
    throw new Error('Não foi possível gerar o código de afiliado.');
  }
};

/**
 * Atualiza os dados do perfil do usuário
 */
export const updateProfile = async (
  userId: string, 
  profileData: { displayName?: string; congregation?: string; phone?: string }
) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { ...profileData });
    return true;
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    throw new Error('Não foi possível atualizar o perfil.');
  }
};
