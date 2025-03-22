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
  role: UserRole;
  phone?: string;
  congregation?: string;
  affiliateCode?: string;
  createdAt: Date;
}

export interface SalesData {
  totalSales: number;
  soldNumbers: string[];
  buyers: string[];
}
