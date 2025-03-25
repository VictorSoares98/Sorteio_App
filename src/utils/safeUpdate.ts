import { doc, updateDoc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Classe de erro personalizada para falhas de transação
 */
export class TransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransactionError";
  }
}

/**
 * Realiza uma atualização segura em um documento do Firestore
 * Implementa tratamento de erros e retry automaticamente
 * 
 * @param collectionName Nome da coleção
 * @param documentId ID do documento
 * @param updateData Dados a serem atualizados
 * @param options Opções adicionais
 * @returns Promise<boolean> indicando sucesso ou falha
 */
export const safeUpdate = async <T extends Record<string, any>>(
  collectionName: string,
  documentId: string,
  updateData: Partial<T> & Record<string, any>,
  options: {
    maxRetries?: number;
    useTransaction?: boolean;
    onError?: (error: any) => void;
    onSuccess?: () => void;
  } = {}
): Promise<boolean> => {
  const {
    maxRetries = 3,
    useTransaction = false,
    onError,
    onSuccess
  } = options;
  
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const docRef = doc(db, collectionName, documentId);
      
      if (useTransaction) {
        // Usar transação para garantir consistência
        await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(docRef);
          if (!docSnap.exists()) {
            throw new Error(`Documento ${collectionName}/${documentId} não encontrado`);
          }
          transaction.update(docRef, updateData);
        });
      } else {
        // Atualização simples
        await updateDoc(docRef, updateData);
      }
      
      if (onSuccess) onSuccess();
      return true;
    } catch (error) {
      console.error(`Erro na tentativa ${retries + 1}/${maxRetries} de atualizar ${collectionName}/${documentId}:`, error);
      retries++;
      
      if (retries >= maxRetries) {
        if (onError) onError(error);
        return false;
      }
      
      // Esperar antes de tentar novamente (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, retries)));
    }
  }
  
  return false;
};

/**
 * Verifica se um documento existe antes de atualizá-lo
 * Útil para operações sensíveis onde a existência do documento é crucial
 */
export const checkAndUpdate = async <T extends Record<string, any>>(
  collectionName: string,
  documentId: string,
  updateData: Partial<T> & Record<string, any>
): Promise<boolean> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.error(`Documento ${collectionName}/${documentId} não encontrado`);
      return false;
    }
    
    await updateDoc(docRef, updateData);
    return true;
  } catch (error) {
    console.error(`Erro ao verificar e atualizar ${collectionName}/${documentId}:`, error);
    return false;
  }
};
