import { doc, updateDoc, getDoc, query, where, collection, getDocs, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserRole, type User, type AffiliationResponse } from '../types/user';

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
 * Gera um código de afiliado único e temporário
 * Este código expira após 30 minutos
 */
export const generateTemporaryAffiliateCode = async (userId: string): Promise<string> => {
  try {
    // Verificar se o usuário existe
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('Usuário não encontrado.');
    }
    
    // Gerar um novo código único
    let code = generateRandomCode();
    let codeExists = await checkCodeExists(code);
    
    // Tentar até encontrar um código único
    while (codeExists) {
      code = generateRandomCode();
      codeExists = await checkCodeExists(code);
    }
    
    // Calcular a data de expiração (30 minutos a partir de agora)
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 30);
    
    // Salvar o código e sua expiração no perfil do usuário
    await updateDoc(userRef, {
      affiliateCode: code,
      affiliateCodeExpiry: Timestamp.fromDate(expiryDate)
    });
    
    return code;
  } catch (error) {
    console.error('Erro ao gerar código temporário de afiliado:', error);
    throw new Error('Não foi possível gerar o código temporário.');
  }
};

/**
 * Afilia um usuário a outro usando código ou email
 */
export const affiliateToUser = async (
  userId: string,
  targetIdentifier: string,
  isEmail: boolean = false
): Promise<AffiliationResponse> => {
  try {
    // Referência ao usuário que vai ser afiliado
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return {
        success: false,
        message: 'Seu usuário não foi encontrado.'
      };
    }
    
    const userData = userSnap.data() as User;
    
    // Se já está afiliado a alguém
    if (userData.affiliatedTo) {
      return {
        success: false,
        message: 'Você já está afiliado a outro usuário.'
      };
    }
    
    // Encontrar o usuário alvo (por email ou código de afiliado)
    let targetUserQuery;
    if (isEmail) {
      targetUserQuery = query(collection(db, 'users'), where('email', '==', targetIdentifier));
    } else {
      targetUserQuery = query(collection(db, 'users'), where('affiliateCode', '==', targetIdentifier));
    }
    
    const querySnapshot = await getDocs(targetUserQuery);
    
    if (querySnapshot.empty) {
      return {
        success: false,
        message: isEmail ? 'Email não encontrado.' : 'Código de afiliado inválido.'
      };
    }
    
    // Pegar o primeiro usuário encontrado
    const targetUserDoc = querySnapshot.docs[0];
    const targetUserId = targetUserDoc.id;
    const targetUserData = targetUserDoc.data() as User;
    
    // Verificar se não está tentando se afiliar a si mesmo
    if (targetUserId === userId) {
      return {
        success: false,
        message: 'Você não pode se afiliar a si mesmo.'
      };
    }
    
    // Se está usando código, verificar se ele não expirou
    if (!isEmail && targetUserData.affiliateCodeExpiry) {
      // Verificar se temos um Timestamp do Firebase ou uma Date normal
      const expiryDate = 'toDate' in targetUserData.affiliateCodeExpiry
        ? targetUserData.affiliateCodeExpiry.toDate()
        : targetUserData.affiliateCodeExpiry;
        
      if (expiryDate < new Date()) {
        return {
          success: false,
          message: 'Este código de afiliado expirou.'
        };
      }
    }
    
    // Fazer a afiliação
    await updateDoc(userRef, {
      affiliatedTo: targetUserId
    });
    
    // Adicionar o usuário à lista de afiliados do alvo
    const targetRef = doc(db, 'users', targetUserId);
    await updateDoc(targetRef, {
      affiliates: arrayUnion(userId)
    });
    
    // Se o usuário alvo não é ADMIN, promovê-lo
    if (targetUserData.role === UserRole.USER) {
      await updateDoc(targetRef, {
        role: UserRole.ADMIN
      });
    }
    
    return {
      success: true,
      message: 'Afiliação realizada com sucesso!',
      affiliatedUser: {
        id: targetUserId,
        displayName: targetUserData.displayName
      }
    };
  } catch (error) {
    console.error('Erro ao afiliar usuário:', error);
    return {
      success: false,
      message: 'Ocorreu um erro ao processar a afiliação.'
    };
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

/**
 * Busca usuários afiliados a um usuário específico
 */
export const getAffiliatedUsers = async (userId: string): Promise<User[]> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists() || !userSnap.data().affiliates) {
      return [];
    }
    
    const userData = userSnap.data();
    const affiliateIds = userData.affiliates || [];
    
    if (affiliateIds.length === 0) {
      return [];
    }
    
    // Buscar detalhes de cada afiliado
    const affiliates: User[] = [];
    for (const id of affiliateIds) {
      const affiliateSnap = await getDoc(doc(db, 'users', id));
      if (affiliateSnap.exists()) {
        const data = affiliateSnap.data();
        affiliates.push({
          ...data,
          id: affiliateSnap.id,
          createdAt: data.createdAt?.toDate()
        } as User);
      }
    }
    
    return affiliates;
  } catch (error) {
    console.error('Erro ao buscar afiliados:', error);
    return [];
  }
};
