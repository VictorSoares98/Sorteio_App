import { Timestamp } from 'firebase/firestore';
import type { FirebaseTimestamp } from '../types/user';

/**
 * Verifica se um valor é um Timestamp do Firebase
 */
export const isFirebaseTimestamp = (value: any): boolean => {
  return value && 
         (value instanceof Timestamp || 
         (typeof value === 'object' && 
          'toDate' in value && 
          typeof value.toDate === 'function'));
};

/**
 * Converte um Timestamp do Firebase para um objeto Date de forma segura
 * 
 * @param timestamp Timestamp do Firebase ou objeto com método toDate
 * @param defaultValue Valor padrão caso o timestamp seja inválido
 * @returns Date convertido ou defaultValue se inválido
 */
export const timestampToDate = (
  timestamp: FirebaseTimestamp | Date | any | null | undefined,
  defaultValue: Date = new Date()
): Date => {
  // Se já for um Date, retorna diretamente
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  // Se for null/undefined, retorna o valor padrão
  if (!timestamp) {
    return defaultValue;
  }
  
  try {
    // Se tiver o método toDate do Firestore
    if ('toDate' in timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // Se tiver propriedade seconds, converte manualmente
    if ('seconds' in timestamp) {
      return new Date(timestamp.seconds * 1000);
    }
    
    // Se chegou aqui, retorna o valor padrão
    return defaultValue;
  } catch (error) {
    console.warn('Erro ao converter timestamp:', error);
    return defaultValue;
  }
};

/**
 * Converte todos os timestamps em um objeto para Date
 * 
 * @param obj Objeto que pode conter timestamps
 * @returns Objeto com timestamps convertidos para Date
 */
export const convertTimestampsInObject = <T extends Record<string, any>>(obj: T): T => {
  const result = { ...obj };
  
  for (const key in result) {
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      const value = result[key];
      
      if (isFirebaseTimestamp(value)) {
        result[key] = timestampToDate(value) as any;
      } else if (typeof value === 'object' && value !== null) {
        result[key] = convertTimestampsInObject(value);
      }
    }
  }
  
  return result;
};

/**
 * Processa um documento do Firestore padronizando timestamps e adicionando o ID
 * 
 * @param doc Documento do Firestore
 * @returns Objeto com dados convertidos e ID
 */
export const processFirestoreDocument = <T extends Record<string, any>>(
  doc: { id: string, data: () => any }
): T & { id: string } => {
  const data = doc.data();
  return {
    ...convertTimestampsInObject(data),
    id: doc.id
  } as T & { id: string };
};
