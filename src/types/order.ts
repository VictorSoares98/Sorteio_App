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
  sellerId: string;
  sellerUsername: string; // Campo adicionado para guardar o username do vendedor
  createdAt: Date;
  numTickets?: number;
}

export interface OrderFormData {
  buyerName: string;
  paymentMethod?: PaymentMethod; // Torna opcional para permitir estado desmarcado
  contactNumber: string;
  addressOrCongregation: string;
  observations?: string;
  numTickets?: number; // Novo campo para número de tickets
}
