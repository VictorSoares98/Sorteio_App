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
 * Verifica a existência de um documento
 * 
 * @param collectionName Nome da coleção
 * @param documentId ID do documento
 * @returns Promise<boolean> Verdadeiro se o documento existe
 */
export const documentExists = async (
  collectionName: string,
  documentId: string
): Promise<boolean> => {
  const docRef = doc(db, collectionName, documentId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
};

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
    createIfNotExists?: boolean;
  } = {}
): Promise<boolean> => {
  const {
    maxRetries = 3,
    useTransaction = false,
    createIfNotExists = false,
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
            if (createIfNotExists) {
              // Criar documento se não existir e a opção estiver habilitada
              transaction.set(docRef, updateData);
            } else {
              throw new TransactionError(`Documento ${collectionName}/${documentId} não encontrado`);
            }
          } else {
            // Atualizar documento existente
            transaction.update(docRef, updateData);
          }
        });
      } else {
        // Verificar existência do documento antes da atualização
        if (!createIfNotExists) {
          const exists = await documentExists(collectionName, documentId);
          if (!exists) {
            throw new Error(`Documento ${collectionName}/${documentId} não encontrado`);
          }
        }
        
        // Atualização simples
        await updateDoc(docRef, updateData);
      }
      
      // Executar callback de sucesso se fornecido
      if (onSuccess) onSuccess();
      return true;
    } catch (error) {
      console.error(`Erro na tentativa ${retries + 1}/${maxRetries} de atualizar ${collectionName}/${documentId}:`, error);
      
      retries++;
      
      // Se atingiu o número máximo de tentativas e ainda falhou
      if (retries >= maxRetries) {
        console.error(`Falha após ${maxRetries} tentativas ao atualizar ${collectionName}/${documentId}`);
        if (onError) onError(error);
        
        // Retornar false em vez de lançar erro para evitar quebrar fluxos de chamada
        return false;
      }
      
      // Esperar um tempo crescente entre tentativas (backoff exponencial)
      const backoffTime = Math.min(1000 * Math.pow(2, retries), 10000);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }
  
  // Este ponto só será alcançado se houver algum problema lógico no loop
  return false;
};

/**
 * Verifica um documento e faz uma atualização condicional
 * 
 * @param collectionName Nome da coleção
 * @param documentId ID do documento
 * @param condition Função que verifica se atualização deve ocorrer
 * @param updateData Dados a serem atualizados
 * @returns Promise<boolean> indicando sucesso ou falha
 */
export const checkAndUpdate = async <T extends Record<string, any>>(
  collectionName: string,
  documentId: string,
  condition: (data: any) => boolean,
  updateData: Partial<T>
): Promise<boolean> => {
  try {
    let success = false;
    
    await runTransaction(db, async (transaction) => {
      const docRef = doc(db, collectionName, documentId);
      const docSnap = await transaction.get(docRef);
      
      // Verificar se o documento existe
      if (!docSnap.exists()) {
        throw new TransactionError(`Documento ${collectionName}/${documentId} não encontrado`);
      }
      
      // Obter dados atuais e verificar condição
      const currentData = docSnap.data();
      
      if (condition(currentData)) {
        // Condição atendida, realizar atualização
        transaction.update(docRef, updateData as any);
        success = true;
      } else {
        // Condição não atendida, não atualizar
        success = false;
      }
    });
    
    return success;
  } catch (error) {
    console.error(`Erro ao verificar e atualizar ${collectionName}/${documentId}:`, error);
    return false;
  }
};
