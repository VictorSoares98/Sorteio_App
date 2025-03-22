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
  createdAt: Date;
}

export interface OrderFormData {
  buyerName: string;
  paymentMethod: PaymentMethod;
  contactNumber: string;
  addressOrCongregation: string;
  observations?: string;
}
