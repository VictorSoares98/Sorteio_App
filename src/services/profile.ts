import { doc, updateDoc, getDoc, query, where, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { User } from '../types/user';

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
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('affiliateCode', '==', code));
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Erro ao verificar existência de código:', error);
    return false;
  }
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
    let code = generateRandomCode();
    let codeExists = await checkCodeExists(code);
    
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

/**
 * Busca um usuário pelo código de afiliado
 */
export const findUserByAffiliateCode = async (code: string): Promise<User | null> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('affiliateCode', '==', code));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const userData = querySnapshot.docs[0].data();
    const createdAt = userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date();
    
    return {
      ...userData,
      createdAt
    } as User;
  } catch (error) {
    console.error('Erro ao buscar usuário por código de afiliado:', error);
    return null;
  }
};
