import { Timestamp, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import type { FirebaseTimestamp } from '../types/user';

/**
 * Verifica se um valor é um Timestamp do Firebase
 */
export const isFirebaseTimestamp = (value: any): boolean => {
  if (!value || typeof value !== 'object') return false;
  
  // Instância direta de Timestamp
  if (value instanceof Timestamp) return true;
  
  // Objeto com método toDate
  if ('toDate' in value && typeof value.toDate === 'function') return true;
  
  // Objeto com seconds e nanoseconds (formato interno do Firestore)
  if ('seconds' in value && 'nanoseconds' in value && 
      typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') return true;
  
  return false;
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
    
    // Se tiver propriedade seconds e nanoseconds, converte conforme padrão Firestore
    if ('seconds' in timestamp && 'nanoseconds' in timestamp) {
      return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    }
    
    // Se tiver apenas seconds, converte por segundos
    if ('seconds' in timestamp) {
      return new Date(timestamp.seconds * 1000);
    }
    
    // Se for um timestamp em milissegundos
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
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
  if (!obj) return obj;
  
  const result = { ...obj };
  
  for (const key in result) {
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      const value = result[key];
      
      if (isFirebaseTimestamp(value)) {
        result[key] = timestampToDate(value) as any;
      } else if (Array.isArray(value)) {
        // Processar arrays recursivamente
        result[key] = value.map((item: unknown) => 
          typeof item === 'object' && item !== null 
            ? convertTimestampsInObject<Record<string, any>>(item as Record<string, any>)
            : item
        ) as any;
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
  doc: DocumentSnapshot | QueryDocumentSnapshot | { id: string, data: () => any }
): T & { id: string } => {
  // Verificar se é um documento válido
  if (!doc) {
    console.warn('Documento inválido passado para processFirestoreDocument');
    return {} as T & { id: string };
  }
  
  // Verificar se tem método data()
  if (typeof doc.data !== 'function') {
    console.warn('Documento sem método data() em processFirestoreDocument');
    return { id: doc.id || 'unknown' } as T & { id: string };
  }
  
  const data = doc.data();
  
  // Se não houver dados, retorna apenas o ID
  if (!data) {
    return { id: doc.id } as T & { id: string };
  }
  
  // Converter timestamps e adicionar ID
  return {
    ...convertTimestampsInObject(data),
    id: doc.id
  } as T & { id: string };
};
