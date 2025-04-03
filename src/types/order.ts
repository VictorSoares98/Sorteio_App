import { 
  MAX_AVAILABLE_NUMBERS, 
  MIN_AVAILABLE_NUMBERS,
  NUMBER_DIGIT_COUNT, 
  RESERVATION_EXPIRY_TIME_MS,
  MAX_NUMBERS_PER_REQUEST,
  TICKET_NUMBER_PREFIX,
  FORMAT_WITH_LEADING_ZEROS
} from '../utils/constants';

export enum PaymentMethod {
  PIX = 'pix',
  DINHEIRO = 'dinheiro'
}

export interface Order {
  id: string;
  buyerName: string;
  paymentMethod: PaymentMethod;
  contactNumber: string;
  addressOrCongregation: string;
  observations?: string;
  generatedNumbers: string[];
  sellerName: string;
  sellerId: string; // Agora será um ID baseado no nome do vendedor
  originalSellerId?: string; // ID original do Firebase para compatibilidade
  sellerUsername: string; 
  createdAt: Date;
  numTickets?: number;
  
  // Campos adicionados para suporte offline
  syncStatus?: 'pending' | 'synced' | 'conflict';
  offlineCreatedAt?: number;
  originalNumbers?: string[]; // Números originais em caso de conflito
  conflictResolved?: boolean;
}

export interface OrderFormData {
  buyerName: string;
  paymentMethod?: PaymentMethod; 
  contactNumber: string;
  addressOrCongregation: string;
  observations?: string;
  numTickets?: number; 
}

/**
 * Interface para reservas temporárias de números
 */
export interface NumberReservation {
  number: string;
  reservedAt: Date;
  expiresAt: Date;
  sessionId: string;
  userId?: string; // Opcional: ID do usuário que fez a reserva
}

/**
 * Interface para configurações de sorteio
 */
export interface LotterySettings {
  maxNumber: number;     // Número máximo permitido (10000)
  minNumber: number;     // Número mínimo permitido (1) 
  digitCount: number;    // Quantidade de dígitos para formatação (5)
  reservationExpiryTimeMs: number;  // Tempo de expiração das reservas em ms
  
  // Novas configurações adicionadas
  maxTicketsPerOrder: number;   // Máximo de números por pedido
  ticketNumberPrefix: string;   // Prefixo opcional para exibição de números (vazio no caso atual)
  formatWithLeadingZeros: boolean;  // Se deve usar zeros à esquerda (true)
}

// Configuração padrão do sorteio
export const DEFAULT_LOTTERY_SETTINGS: LotterySettings = {
  maxNumber: MAX_AVAILABLE_NUMBERS,
  minNumber: MIN_AVAILABLE_NUMBERS,
  digitCount: NUMBER_DIGIT_COUNT,
  reservationExpiryTimeMs: RESERVATION_EXPIRY_TIME_MS,
  maxTicketsPerOrder: MAX_NUMBERS_PER_REQUEST,
  ticketNumberPrefix: TICKET_NUMBER_PREFIX,
  formatWithLeadingZeros: FORMAT_WITH_LEADING_ZEROS
};

// Novo tipo para status de conexão
export type ConnectionStatus = 'online' | 'offline' | 'reconnecting';
