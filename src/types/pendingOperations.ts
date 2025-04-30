/**
 * Interface base para todas as operações pendentes
 * que precisam ser sincronizadas com o servidor
 */
export interface PendingOperation {
  /** Identificador único da operação */
  id: string;
  
  /** Timestamp de quando a operação foi registrada */
  createdAt: Date;
  
  /** ID opcional do sorteio ao qual esta operação pertence */
  raffleId?: string;
  
  /** Número de tentativas já realizadas para sincronizar esta operação */
  attempts: number;
  
  /** Timestamp da última tentativa de sincronização */
  lastAttempt?: Date;
  
  /** Status atual da operação */
  status: 'pending' | 'in-progress' | 'failed';
  
  /** Erro encontrado na última tentativa (se houver) */
  lastError?: string;
}

/**
 * Interface para operações de reserva de números pendentes
 */
export interface PendingReserveOperation extends PendingOperation {
  /** Tipo da operação: reserva */
  type: 'reserve';
  
  /** Lista de números a serem reservados */
  numbers: string[];
  
  /** Minutos até a expiração da reserva */
  expiryMinutes: number;
}

/**
 * Interface para operações de marcação de números como vendidos
 */
export interface PendingSoldOperation extends PendingOperation {
  /** Tipo da operação: venda */
  type: 'sold';
  
  /** Lista de números a serem marcados como vendidos */
  numbers: string[];
  
  /** Detalhes do pedido associado à venda */
  orderDetails: {
    /** ID único do pedido */
    orderId: string;
    
    /** ID do comprador (opcional) */
    buyerId?: string;
    
    /** Nome do comprador (opcional) */
    buyerName?: string;
    
    /** ID do vendedor (opcional) */
    sellerId?: string;
  };
}

/**
 * Tipo que representa qualquer tipo de operação pendente
 */
export type AnyPendingOperation = PendingReserveOperation | PendingSoldOperation;

/**
 * Interface para o armazenamento de operações pendentes
 * mantém compatibilidade com a estrutura atual
 */
export interface PendingOperationsStore {
  /** Operações de reserva pendentes */
  reserveNumbers: PendingReserveOperation[];
  
  /** Operações de marcação como vendido pendentes */
  markAsSold: PendingSoldOperation[];
}

/**
 * Cria uma nova operação de reserva pendente
 */
export function createPendingReserveOperation(
  numbers: string[],
  expiryMinutes: number,
  raffleId?: string
): PendingReserveOperation {
  return {
    id: generateOperationId('reserve'),
    type: 'reserve',
    createdAt: new Date(),
    numbers: [...numbers],
    expiryMinutes,
    raffleId,
    attempts: 0,
    status: 'pending'
  };
}

/**
 * Cria uma nova operação de venda pendente
 */
export function createPendingSoldOperation(
  numbers: string[],
  orderDetails: {
    orderId: string,
    buyerId?: string,
    buyerName?: string,
    sellerId?: string
  },
  raffleId?: string
): PendingSoldOperation {
  return {
    id: generateOperationId('sold'),
    type: 'sold',
    createdAt: new Date(),
    numbers: [...numbers],
    orderDetails: { ...orderDetails },
    raffleId,
    attempts: 0,
    status: 'pending'
  };
}

/**
 * Gera um ID único para operações pendentes
 */
function generateOperationId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${timestamp}-${random}`;
}
