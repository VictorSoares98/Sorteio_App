import { runTransaction, doc } from "firebase/firestore";
import { db } from "../firebase";

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
 * Executa atualizações de documento de forma segura usando transações
 * para garantir atomicidade e evitar race conditions
 */
export async function safeUpdate(
  collectionName: string, 
  documentId: string, 
  updateFn: (data: any) => any
): Promise<void> {
  try {
    console.log(`[SafeUpdate] Iniciando atualização segura para ${collectionName}/${documentId}`);
    
    await runTransaction(db, async (transaction) => {
      const docRef = doc(db, collectionName, documentId);
      const docSnapshot = await transaction.get(docRef);
      
      if (!docSnapshot.exists()) {
        throw new TransactionError(`Documento ${collectionName}/${documentId} não existe`);
      }
      
      const currentData = docSnapshot.data();
      const updatedData = updateFn(currentData);
      
      // Verificar se retornou dados válidos
      if (!updatedData || typeof updatedData !== 'object') {
        throw new TransactionError('Função de atualização retornou dados inválidos');
      }
      
      // Aplicar atualização
      transaction.update(docRef, updatedData);
    });
    
    console.log(`[SafeUpdate] Atualização concluída para ${collectionName}/${documentId}`);
  } catch (error) {
    console.error(`[SafeUpdate] Erro na atualização de ${collectionName}/${documentId}:`, error);
    throw error;
  }
}
