import { 
  NUMBERS_PER_BATCH, 
  BATCH_PREFIX,
  TOTAL_BATCHES
} from './batchConstants';
import { NUMBER_DIGIT_COUNT } from './constants'; 

/**
 * Calcula o ID do batch para um determinado número
 * @param number Número do sorteio (string ou number)
 * @returns ID do batch (ex: "batch_1")
 */
export function getBatchIdForNumber(number: string | number): string {
  const numValue = typeof number === 'string' ? parseInt(number, 10) : number;
  const batchNumber = Math.ceil(numValue / NUMBERS_PER_BATCH);
  
  // Garantir que esteja dentro do intervalo válido
  if (batchNumber < 1 || batchNumber > TOTAL_BATCHES) {
    throw new Error(`Número fora do intervalo válido para cálculo de batch: ${numValue}`);
  }
  
  return `${BATCH_PREFIX}${batchNumber}`;
}

/**
 * Retorna o intervalo de números em um determinado batch
 * @param batchId ID do batch (ex: "batch_1")
 * @returns Objeto com número inicial e final do batch
 */
export function getBatchRange(batchId: string): { start: number; end: number } {
  const batchNumber = parseInt(batchId.replace(BATCH_PREFIX, ''), 10);
  
  if (isNaN(batchNumber) || batchNumber < 1 || batchNumber > TOTAL_BATCHES) {
    throw new Error(`ID de batch inválido: ${batchId}`);
  }
  
  const start = (batchNumber - 1) * NUMBERS_PER_BATCH + 1;
  const end = Math.min(batchNumber * NUMBERS_PER_BATCH, 10000);
  
  return { start, end };
}

/**
 * Formata um número para o formato padrão do sorteio
 * @param number Número a ser formatado
 * @returns Número formatado com zeros à esquerda
 */
export function formatBatchNumber(number: number | string): string {
  const numStr = typeof number === 'number' ? number.toString() : number;
  return numStr.padStart(NUMBER_DIGIT_COUNT, '0');
}

/**
 * Verifica se um número está dentro de um determinado batch
 * @param number Número do sorteio
 * @param batchId ID do batch
 */
export function isNumberInBatch(number: string | number, batchId: string): boolean {
  const numValue = typeof number === 'string' ? parseInt(number, 10) : number;
  const { start, end } = getBatchRange(batchId);
  
  return numValue >= start && numValue <= end;
}

/**
 * Retorna todos os IDs de batch válidos
 */
export function getAllBatchIds(): string[] {
  const batchIds: string[] = [];
  
  for (let i = 1; i <= TOTAL_BATCHES; i++) {
    batchIds.push(`${BATCH_PREFIX}${i}`);
  }
  
  return batchIds;
}
