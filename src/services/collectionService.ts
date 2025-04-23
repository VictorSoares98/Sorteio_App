import { collection, doc, CollectionReference, DocumentReference } from 'firebase/firestore';
import { db } from '../firebase';
import { getCollectionPrefix, isTest } from '../utils/environment';

// Sistema de mock para ambiente de testes
const mockStore: Record<string, Record<string, any>> = {};
let useMockData = false;

/**
 * Ativa o uso de dados simulados para testes
 * @param enable Define se o mock será ativado
 */
export function enableMockData(enable: boolean = true): void {
  useMockData = enable && isTest();
}

/**
 * Configura dados simulados para uma coleção específica
 * 
 * @param collectionName Nome da coleção (sem prefixo)
 * @param data Dados simulados para a coleção
 */
export function setMockData<T = any>(collectionName: string, data: Record<string, T>): void {
  const prefixedName = getPrefixedCollectionName(collectionName);
  mockStore[prefixedName] = data;
}

/**
 * Limpa todos os dados simulados
 */
export function clearAllMockData(): void {
  Object.keys(mockStore).forEach(key => delete mockStore[key]);
}

/**
 * Obtém dados simulados para um documento específico
 * 
 * @param collectionName Nome da coleção (sem prefixo)
 * @param documentId ID do documento
 * @returns Dados simulados ou undefined se não existir
 */
export function getMockDocument<T = any>(collectionName: string, documentId: string): T | undefined {
  const prefixedName = getPrefixedCollectionName(collectionName);
  return mockStore[prefixedName]?.[documentId];
}

/**
 * Retorna o nome da coleção com prefixo de ambiente
 * 
 * @param collectionName Nome original da coleção
 * @returns Nome da coleção com prefixo aplicado
 */
export function getPrefixedCollectionName(collectionName: string): string {
  return `${getCollectionPrefix()}${collectionName}`;
}

/**
 * Obtém referência à coleção com prefixo de ambiente
 * 
 * @param collectionName Nome original da coleção
 * @returns Referência à coleção com prefixo
 */
export function getCollection<T = any>(collectionName: string): CollectionReference<T> {
  const prefixedName = getPrefixedCollectionName(collectionName);
  return collection(db, prefixedName) as CollectionReference<T>;
}

/**
 * Obtém referência a documento em coleção prefixada
 * 
 * @param collectionName Nome original da coleção
 * @param documentId ID do documento
 * @returns Referência ao documento em coleção prefixada
 */
export function getDocument<T = any>(collectionName: string, documentId: string): DocumentReference<T> {
  // Se estivermos em modo de mock e o documento existir no mock, retornar uma referência simulada
  if (useMockData && mockStore[getPrefixedCollectionName(collectionName)]?.[documentId]) {
    // Criar uma referência de documento simulada que funciona com funções que esperam DocumentReference
    return {
      id: documentId,
      path: `${getPrefixedCollectionName(collectionName)}/${documentId}`,
      parent: getCollection(collectionName)
      // Outras propriedades podem ser adicionadas conforme necessário
    } as unknown as DocumentReference<T>;
  }
  
  const prefixedName = getPrefixedCollectionName(collectionName);
  return doc(db, prefixedName, documentId) as DocumentReference<T>;
}
