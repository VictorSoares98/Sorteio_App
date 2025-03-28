import { doc, updateDoc, getDoc, query, where, collection, getDocs, arrayUnion, Timestamp, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { UserRole, type User, type AffiliationResponse } from '../types/user';
import { processFirestoreDocument } from '../utils/firebaseUtils';

/**
 * Gera um código de afiliado aleatório com melhor segurança
 * Modificado para usar caracteres mais distinguíveis e adicionar entropia
 */
const generateRandomCode = (): string => {
  // Removidos caracteres ambíguos como 0/O, 1/I, etc.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  
  // Usar Crypto API quando disponível
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const randomValues = new Uint32Array(6);
    window.crypto.getRandomValues(randomValues);
    
    let result = '';
    for (let i = 0; i < 6; i++) {
      // Mapear cada valor aleatório para um índice no intervalo de chars
      const index = randomValues[i] % chars.length;
      result += chars.charAt(index);
    }
    return result;
  } 
  
  // Fallback para método menos seguro, mas com entropia adicional
  let result = '';
  const timestamp = Date.now().toString();
  let entropyInput = timestamp;
  
  for (let i = 0; i < 6; i++) {
    // Adiciona entropia misturando a posição atual com timestamp
    const seedValue = entropyInput + i.toString();
    let combinedSeed = 0;
    
    // Fisher-Yates para gerar índice mais aleatório
    for (let j = 0; j < seedValue.length; j++) {
      combinedSeed = ((combinedSeed << 5) - combinedSeed) + seedValue.charCodeAt(j);
    }
    
    const index = Math.abs(combinedSeed) % chars.length;
    result += chars.charAt(index);
    
    // Atualiza a entrada de entropia para próxima iteração
    entropyInput = seedValue + result;
  }
  
  return result;
};

/**
 * Verifica se um código de afiliado já existe
 * Otimizado com verificação de códigos expirados
 */
const checkCodeExists = async (code: string): Promise<boolean> => {
  try {
    const usersRef = collection(db, 'users');
    
    // Verificação em duas etapas para melhor eficiência
    const q = query(usersRef, where('affiliateCode', '==', code));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return false; // Código não existe
    }
    
    // Se existir, verificar se não está expirado
    for (const docSnapshot of querySnapshot.docs) {
      const userData = docSnapshot.data();
      if (userData.affiliateCodeExpiry) {
        const expiryDate = userData.affiliateCodeExpiry.toDate();
        
        // Se o código existe mas está expirado, pode ser considerado não existente
        if (expiryDate < new Date()) {
          continue;
        }
      }
      
      // Se chegou aqui, o código existe e está válido
      return true;
    }
    
    // Se todos os códigos encontrados estavam expirados
    return false;
    
  } catch (error) {
    console.error('Erro ao verificar existência de código:', error);
    return false;
  }
};

/**
 * Valida o formato do código de afiliado
 */
const isValidCodeFormat = (code: string): boolean => {
  // Modificado para aceitar entrada em minúsculas ou maiúsculas
  // (o servidor normalizará para maiúsculas antes do processamento)
  const codeRegex = /^[A-Za-z0-9]{6}$/;
  return codeRegex.test(code);
};

/**
 * Gera um código de afiliado único usando estratégia melhorada
 * @param expiryMinutes Define se o código deve ter tempo de expiração, em minutos
 */
const generateUniqueAffiliateCode = async (expiryMinutes?: number): Promise<{ 
  code: string, 
  expiryDate?: Date 
}> => {
  // Número máximo de tentativas para evitar loop infinito
  const MAX_ATTEMPTS = 10;
  let attempts = 0;
  
  while (attempts < MAX_ATTEMPTS) {
    // Gerar um novo código
    const code = generateRandomCode();
    
    // Validar o formato do código
    if (!isValidCodeFormat(code)) {
      attempts++;
      continue;
    }
    
    // Verificar se o código já existe
    const codeExists = await checkCodeExists(code);
    
    if (!codeExists) {
      // Se foi especificado um tempo de expiração, calcular data
      let expiryDate: Date | undefined;
      if (expiryMinutes && expiryMinutes > 0) {
        expiryDate = new Date();
        expiryDate.setMinutes(expiryDate.getMinutes() + expiryMinutes);
      }
      
      return { code, expiryDate };
    }
    
    attempts++;
  }
  
  // Se não conseguiu gerar um código único após várias tentativas
  throw new Error('Não foi possível gerar um código único. Tente novamente.');
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
    
    // Se o usuário já tem um código não expirado, retorná-lo
    if (userData.affiliateCode) {
      // Verificar se o código tem expiração
      if (userData.affiliateCodeExpiry) {
        const expiryDate = userData.affiliateCodeExpiry.toDate();
        if (expiryDate > new Date()) {
          return userData.affiliateCode;
        }
        // Se código expirou, vamos gerar um novo
      } else {
        // Se não tem expiração, retornar o código existente
        return userData.affiliateCode;
      }
    }
    
    // Usar função auxiliar para gerar código único
    const { code } = await generateUniqueAffiliateCode();
    
    // Salvar o código no perfil do usuário
    await updateDoc(userRef, {
      affiliateCode: code,
      affiliateCodeExpiry: null // Código permanente não tem expiração
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
    
    // Verificar se já tem um código válido
    const userData = userSnap.data();
    if (userData.affiliateCode && userData.affiliateCodeExpiry) {
      const expiryDate = userData.affiliateCodeExpiry.toDate();
      if (expiryDate > new Date()) {
        // Se ainda é válido, retornar o código existente
        console.log('Código existente ainda válido, retornando-o');
        return userData.affiliateCode;
      }
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
 * Melhorado para validação mais rigorosa e processamento transacional
 */
export const affiliateToUser = async (
  userId: string,
  targetIdentifier: string,
  isEmail: boolean = false
): Promise<AffiliationResponse> => {
  try {
    console.log('[ProfileService] Iniciando processo de afiliação', { userId, targetType: isEmail ? 'email' : 'código' });
    
    // Normalizar código para maiúsculas
    const normalizedIdentifier = isEmail ? targetIdentifier : targetIdentifier.toUpperCase();
    
    // Validar o formato do identificador
    if (!isEmail && !isValidCodeFormat(normalizedIdentifier)) {
      return {
        success: false,
        message: 'Formato de código de afiliação inválido. Deve ter 6 caracteres alfanuméricos.'
      };
    }
    
    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier)) {
      return {
        success: false,
        message: 'Formato de email inválido.'
      };
    }
    
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
    
    // REGRA 1: Se já está afiliado a alguém
    if (userData.affiliatedTo) {
      console.warn('[ProfileService] Usuário já afiliado a outro usuário');
      return {
        success: false,
        message: 'Você já está afiliado a outro usuário e não pode mudar sua afiliação.'
      };
    }
    
    // REGRA 2: Se já tem afiliados, não pode se afiliar a outra pessoa
    if (userData.affiliates && userData.affiliates.length > 0) {
      console.warn('[ProfileService] Usuário com afiliados tentando se afiliar a outro');
      return {
        success: false,
        message: 'Usuários que já possuem afiliados não podem se afiliar a outras contas para preservar a estrutura hierárquica.'
      };
    }
    
    // Encontrar o usuário alvo (por email ou código de afiliado)
    let targetUserQuery;
    if (isEmail) {
      console.log('[ProfileService] Buscando usuário por email');
      targetUserQuery = query(collection(db, 'users'), where('email', '==', normalizedIdentifier));
    } else {
      console.log('[ProfileService] Buscando usuário por código');
      targetUserQuery = query(collection(db, 'users'), where('affiliateCode', '==', normalizedIdentifier));
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
    
    // NOVA REGRA 3: Verificar se o alvo já está afiliado a alguém
    if (targetUserData.affiliatedTo) {
      console.warn('[ProfileService] Usuário alvo já afiliado a outro usuário e não pode receber afiliados');
      return {
        success: false,
        message: 'Este usuário já está afiliado a outra pessoa e não pode receber afiliados.'
      };
    }
    
    console.log('[ProfileService] Executando transação de afiliação');
    
    // Usar uma transação para garantir atomicidade
    let transactionSuccess = false;
    await runTransaction(db, async (transaction) => {
      // 1. Verificar status atual do usuário
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado durante a transação.');
      }
      
      const currentUserData = userDoc.data();
      
      // VERIFICAÇÃO EXTRA: Verificar novamente na transação para garantir consistência
      if (currentUserData.affiliatedTo) {
        throw new Error('Usuário já possui afiliação.');
      }
      
      if (currentUserData.affiliates && currentUserData.affiliates.length > 0) {
        throw new Error('Usuário com afiliados não pode se afiliar a outro usuário.');
      }
      
      // 2. Verificar status atual do usuário alvo
      const targetRef = doc(db, 'users', targetUserId);
      const targetDoc = await transaction.get(targetRef);
      
      if (!targetDoc.exists()) {
        throw new Error('Usuário alvo não encontrado durante a transação.');
      }
      
      // VERIFICAÇÃO EXTRA: Verificar novamente se o alvo já está afiliado
      const targetData = targetDoc.data();
      if (targetData.affiliatedTo) {
        throw new Error('O usuário alvo já está afiliado a outra pessoa e não pode receber afiliados.');
      }
      
      // 3. Atualizar o usuário com o link de afiliação
      transaction.update(userRef, {
        affiliatedTo: targetUserData.displayName,
        affiliatedToId: targetUserId
      });
      
      // 4. Adicionar o usuário à lista de afiliados do alvo
      const currentAffiliates = targetDoc.data().affiliates || [];
      
      if (!currentAffiliates.includes(userId)) {
        transaction.update(targetRef, {
          affiliates: arrayUnion(userId)
        });
      }
      
      // 5. Se o usuário alvo não é ADMIN, promovê-lo
      if (targetDoc.data().role === UserRole.USER) {
        transaction.update(targetRef, {
          role: UserRole.ADMIN
        });
      }
      
      transactionSuccess = true;
    });
    
    if (!transactionSuccess) {
      return {
        success: false,
        message: 'Erro durante o processo de afiliação. Tente novamente.'
      };
    }
    
    // 6. Atualizar informações de afiliação no perfil do usuário
    await updateDoc(doc(db, 'users', userId), {
      affiliatedToEmail: targetUserData.email,
      affiliatedToInfo: {
        id: targetUserId,
        displayName: targetUserData.displayName,
        email: targetUserData.email,
        congregation: targetUserData.congregation || '',
        photoURL: targetUserData.photoURL || ''
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
 * Remove um afiliado de um usuário
 */
export const removeAffiliate = async (
  ownerId: string,
  affiliateId: string
): Promise<AffiliationResponse> => {
  try {
    const ownerRef = doc(db, 'users', ownerId);
    const affiliateRef = doc(db, 'users', affiliateId);
    
    // Buscar documentos para validação
    const ownerDoc = await getDoc(ownerRef);
    const affiliateDoc = await getDoc(affiliateRef);
    
    if (!ownerDoc.exists()) {
      return {
        success: false,
        message: 'Seu perfil não foi encontrado.'
      };
    }
    
    if (!affiliateDoc.exists()) {
      return {
        success: false,
        message: 'Perfil do afiliado não encontrado.'
      };
    }
    
    const ownerData = ownerDoc.data();
    const affiliateData = affiliateDoc.data();
    
    // Verificar se o afiliado realmente pertence ao usuário
    const affiliates = ownerData.affiliates || [];
    if (!affiliates.includes(affiliateId)) {
      return {
        success: false,
        message: 'Este usuário não é seu afiliado.'
      };
    }
    
    // Verificar se o afiliado tem o proprietário como affiliatedTo
    if (affiliateData.affiliatedToId !== ownerId) {
      console.warn('Inconsistência: Afiliado não referencia o proprietário correto');
    }
    
    // Usar uma transação para garantir atomicidade
    let transactionSuccess = false;
    await runTransaction(db, async (transaction) => {
      // 1. Remover o afiliado da lista do proprietário
      transaction.update(ownerRef, {
        affiliates: ownerData.affiliates.filter((id: string) => id !== affiliateId)
      });
      
      // 2. Remover informações de afiliação do afiliado
      transaction.update(affiliateRef, {
        affiliatedTo: null,
        affiliatedToId: null,
        affiliatedToEmail: null,
        affiliatedToInfo: null
      });
      
      transactionSuccess = true;
    });
    
    if (!transactionSuccess) {
      return {
        success: false,
        message: 'Erro durante o processo de remoção. Tente novamente.'
      };
    }
    
    console.log('[ProfileService] Afiliado removido com sucesso');
    return {
      success: true,
      message: 'Afiliado removido com sucesso!'
    };
  } catch (error) {
    console.error('[ProfileService] Erro ao remover afiliado:', error);
    return {
      success: false,
      message: 'Ocorreu um erro ao processar a remoção do afiliado.'
    };
  }
};

/**
 * Atualiza o papel (role/hierarquia) de um afiliado
 */
export const updateAffiliateRole = async (
  ownerId: string,
  affiliateId: string,
  newRole: UserRole
): Promise<AffiliationResponse> => {
  try {
    // Validar o papel solicitado
    const validRoles = [UserRole.ADMIN, UserRole.SECRETARIA, UserRole.TESOUREIRO, UserRole.USER];
    if (!validRoles.includes(newRole)) {
      return {
        success: false,
        message: 'Papel inválido.'
      };
    }
    
    const ownerRef = doc(db, 'users', ownerId);
    const affiliateRef = doc(db, 'users', affiliateId);
    
    // Buscar documentos para validação
    const ownerDoc = await getDoc(ownerRef);
    const affiliateDoc = await getDoc(affiliateRef);
    
    if (!ownerDoc.exists()) {
      return {
        success: false,
        message: 'Seu perfil não foi encontrado.'
      };
    }
    
    if (!affiliateDoc.exists()) {
      return {
        success: false,
        message: 'Perfil do afiliado não encontrado.'
      };
    }
    
    const ownerData = ownerDoc.data();
    const affiliateData = affiliateDoc.data();
    
    // Verificar se o afiliado realmente pertence ao usuário
    const affiliates = ownerData.affiliates || [];
    if (!affiliates.includes(affiliateId)) {
      return {
        success: false,
        message: 'Este usuário não é seu afiliado.'
      };
    }
    
    // Verificar se o afiliado já tem o papel solicitado
    if (affiliateData.role === newRole) {
      return {
        success: false,
        message: 'O usuário já possui este papel.'
      };
    }
    
    // Atualizar o papel do afiliado
    await updateDoc(affiliateRef, {
      role: newRole
    });
    
    console.log(`[ProfileService] Papel do afiliado atualizado para ${newRole}`);
    return {
      success: true,
      message: 'Papel do afiliado atualizado com sucesso!'
    };
  } catch (error) {
    console.error('[ProfileService] Erro ao atualizar papel do afiliado:', error);
    return {
      success: false,
      message: 'Ocorreu um erro ao processar a atualização do papel.'
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