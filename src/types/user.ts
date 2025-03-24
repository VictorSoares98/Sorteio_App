export enum UserRole {
  USER = 'user',
  CONTADOR = 'contador',
  SECRETARIA = 'secretaria',
  ADMIN = 'admin'
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  username: string;
  role: UserRole;
  phone?: string;
  congregation?: string;
  affiliateCode?: string;
  affiliateCodeExpiry?: Date | FirebaseTimestamp; // Atualizado para suportar ambos os tipos
  affiliatedTo?: string;      // ID do usuário ao qual este está afiliado
  affiliates?: string[];      // IDs dos usuários afiliados a este
  createdAt: Date;
}

// Interface para lidar com Timestamp do Firebase
export interface FirebaseTimestamp {
  toDate(): Date;
  seconds: number;
  nanoseconds: number;
}

export interface SalesData {
  totalSales: number;
  soldNumbers: string[];
  buyers: string[];
}

// Interface para a resposta da afiliação
export interface AffiliationResponse {
  success: boolean;
  message: string;
  affiliatedUser?: {
    id: string;
    displayName: string;
  };
}
