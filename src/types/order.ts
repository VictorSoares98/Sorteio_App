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
