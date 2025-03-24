import { UserRole } from '../types/user';

/**
 * Verifica se o usuário tem permissão de administrador
 */
export const isAdmin = (userRole?: UserRole): boolean => {
  return userRole === UserRole.ADMIN;
};

/**
 * Verifica se o usuário tem permissão para acessar funções de contabilidade
 */
export const isTesoureiro = (userRole?: UserRole): boolean => {
  return userRole === UserRole.TESOUREIRO || userRole === UserRole.ADMIN;
};

/**
 * Verifica se o usuário tem permissão para acessar funções de secretaria
 */
export const isSecretaria = (userRole?: UserRole): boolean => {
  return userRole === UserRole.SECRETARIA || userRole === UserRole.ADMIN;
};

/**
 * Verifica se o usuário pode visualizar relatórios de vendas
 */
export const canViewSalesReports = (userRole?: UserRole): boolean => {
  return userRole === UserRole.ADMIN || 
         userRole === UserRole.TESOUREIRO || 
         userRole === UserRole.SECRETARIA;
};

/**
 * Verifica se o usuário pode gerenciar outros usuários
 */
export const canManageUsers = (userRole?: UserRole): boolean => {
  return userRole === UserRole.ADMIN;
};
