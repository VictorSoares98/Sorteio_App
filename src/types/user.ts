export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  TESOUREIRO = 'tesoureiro',
  SECRETARIA = 'secretaria'
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  username?: string;
  photoURL?: string;
  role: UserRole;
  phone?: string;
  congregation?: string;
  createdAt?: Date;
  lastLogin?: Date;
  affiliateCode?: string;
  affiliates?: string[];
  affiliatedTo?: string;
  affiliatedToId?: string;
  affiliatedToEmail?: string;
  
  // Propriedades para bloqueio de usuário
  isBlocked?: boolean;
  blockReason?: string | null;
  blockStartDate?: Date | null;
  blockExpiration?: Date | null;
  
  // Propriedades para afiliação
  affiliatedToInfo?: {
    displayName: string;
    email: string;
    photoURL?: string;
  }
}

export interface UserNote {
  userId: string;
  note: string;
  updatedAt: Date;
}

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
