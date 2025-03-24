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
  maxNumber: 10000,
  minNumber: 1,
  digitCount: 5,
  reservationExpiryTimeMs: 5 * 60 * 1000, // 5 minutos
  maxTicketsPerOrder: 100,
  ticketNumberPrefix: '',
  formatWithLeadingZeros: true
};
