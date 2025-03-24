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
  maxNumber: number;
  minNumber: number;
  digitCount: number;
  reservationExpiryTimeMs: number;
}
