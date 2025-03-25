import { doc, updateDoc, getDoc, query, where, collection, getDocs, arrayUnion, Timestamp, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { UserRole, type User, type AffiliationResponse } from '../types/user';
import { processFirestoreDocument } from '../utils/firebaseUtils';

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
 * Gera um código de afiliado único usando estratégia comum
 * @param expiryMinutes Define se o código deve ter tempo de expiração, em minutos
 */
const generateUniqueAffiliateCode = async (expiryMinutes?: number): Promise<{ 
  code: string, 
  expiryDate?: Date 
}> => {
  // Gerar um novo código único
  let code = generateRandomCode();
  let codeExists = await checkCodeExists(code);
  
  // Tentar até encontrar um código único
  while (codeExists) {
    code = generateRandomCode();
    codeExists = await checkCodeExists(code);
  }
  
  // Se foi especificado um tempo de expiração, calcular data
  let expiryDate: Date | undefined;
  if (expiryMinutes && expiryMinutes > 0) {
    expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + expiryMinutes);
  }
  
  return { code, expiryDate };
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
    
    // Usar função auxiliar para gerar código único
    const { code } = await generateUniqueAffiliateCode();
    
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
    
    // Usar função auxiliar para gerar código único com expiração de 30 minutos
    const { code, expiryDate } = await generateUniqueAffiliateCode(30);
    
    // Salvar o código e sua expiração no perfil do usuário
    await updateDoc(userRef, {
      affiliateCode: code,
      affiliateCodeExpiry: expiryDate ? Timestamp.fromDate(expiryDate) : null
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
    console.log('[ProfileService] Iniciando processo de afiliação', { userId, targetType: isEmail ? 'email' : 'código' });
    // Referência ao usuário que vai ser afiliado
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.warn('[ProfileService] Usuário não encontrado');
      return {
        success: false,
        message: 'Seu usuário não foi encontrado.'
      };
    }
    
    const userData = userSnap.data() as User;
    
    // Se já está afiliado a alguém
    if (userData.affiliatedTo) {
      console.warn('[ProfileService] Usuário já afiliado a outro usuário');
      return {
        success: false,
        message: 'Você já está afiliado a outro usuário.'
      };
    }
    
    // NOVA VERIFICAÇÃO: Se já tem afiliados, não pode se afiliar a outra pessoa
    if (userData.affiliates && userData.affiliates.length > 0) {
      console.warn('[ProfileService] Usuário com afiliados tentando se afiliar a outro');
      return {
        success: false,
        message: 'Usuários que já possuem afiliados não podem se afiliar a outras contas.'
      };
    }
    
    // Encontrar o usuário alvo (por email ou código de afiliado)
    let targetUserQuery;
    if (isEmail) {
      console.log('[ProfileService] Buscando usuário por email');
      targetUserQuery = query(collection(db, 'users'), where('email', '==', targetIdentifier));
    } else {
      console.log('[ProfileService] Buscando usuário por código');
      targetUserQuery = query(collection(db, 'users'), where('affiliateCode', '==', targetIdentifier));
    }
    
    const querySnapshot = await getDocs(targetUserQuery);
    
    if (querySnapshot.empty) {
      console.warn('[ProfileService] Usuário alvo não encontrado');
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
      console.warn('[ProfileService] Tentativa de auto-afiliação');
      return {
        success: false,
        message: 'Você não pode se afiliar a si mesmo.'
      };
    }
    
    // Se está usando código, verificar se ele não expirou
    if (!isEmail && targetUserData.affiliateCodeExpiry) {
      console.log('[ProfileService] Verificando validade do código');
      // Verificar se temos um Timestamp do Firebase ou uma Date
      const expiryDate = 'toDate' in targetUserData.affiliateCodeExpiry
        ? targetUserData.affiliateCodeExpiry.toDate()
        : targetUserData.affiliateCodeExpiry;
        
      if (expiryDate < new Date()) {
        console.warn('[ProfileService] Código expirado');
        return {
          success: false,
          message: 'Este código de afiliado expirou.'
        };
      }
    }
    
    console.log('[ProfileService] Executando transação de afiliação');
    // MELHORIA: Usar uma transação para garantir atomicidade
    await runTransaction(db, async (transaction) => {
      // 1. Atualizar o usuário com o link de afiliação
      transaction.update(userRef, {
        affiliatedTo: targetUserId
      });
      
      // 2. Adicionar o usuário à lista de afiliados do alvo
      const targetRef = doc(db, 'users', targetUserId);
      
      // Primeiro ler o documento para garantir dados atualizados
      const targetDocSnap = await transaction.get(targetRef);
      const currentAffiliates = targetDocSnap.exists() 
        ? targetDocSnap.data().affiliates || [] 
        : [];
      
      if (!currentAffiliates.includes(userId)) {
        transaction.update(targetRef, {
          affiliates: arrayUnion(userId)
        });
      }
      
      // 3. Se o usuário alvo não é ADMIN, promovê-lo
      if (targetDocSnap.exists() && targetDocSnap.data().role === UserRole.USER) {
        transaction.update(targetRef, {
          role: UserRole.ADMIN
        });
      }
    });
    
    // Atualizar o usuário atual para indicar que está afiliado ao alvo
    // Armazenar mais informações sobre o afiliador
    await updateDoc(doc(db, 'users', userId), {
      affiliatedTo: targetUserData.displayName,
      affiliatedToId: targetUserId,
      affiliatedToEmail: targetUserData.email,
      affiliatedToInfo: {
        id: targetUserId,
        displayName: targetUserData.displayName,
        email: targetUserData.email,
        congregation: targetUserData.congregation || '',
        photoURL: targetUserData.photoURL || '' // Agora é seguro usar esta propriedade
      }
    });

    console.log('[ProfileService] Afiliação concluída com sucesso');
    return {
      success: true,
      message: 'Afiliação realizada com sucesso!',
      affiliatedUser: {
        id: targetUserId,
        displayName: targetUserData.displayName
      }
    };
  } catch (error) {
    console.error('[ProfileService] Erro ao afiliar usuário:', error);
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
    
    // Usar a função utilitária processFirestoreDocument
    return processFirestoreDocument<User>(querySnapshot.docs[0]);
    
  } catch (error) {
    console.error('Erro ao buscar usuário por código de afiliado:', error);
    return null;
  }
};

/**
 * Busca um usuário pelo username
 */
export const findUserByUsername = async (username: string): Promise<User | null> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    // Usar a função utilitária processFirestoreDocument
    return processFirestoreDocument<User>(querySnapshot.docs[0]);
    
  } catch (error) {
    console.error('Erro ao buscar usuário por username:', error);
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
        // Usar a função utilitária processFirestoreDocument
        affiliates.push(processFirestoreDocument<User>(affiliateSnap));
      }
    }
    
    return affiliates;
  } catch (error) {
    console.error('Erro ao buscar afiliados:', error);
    return [];
  }
};