import { UserRole } from '../types/user';

/**
 * Formata o papel do usuário para exibição em português
 */
export const formatUserRole = (role?: UserRole): string => {
  if (!role) return 'Desconhecido';
  
  const roleMap = {
    [UserRole.USER]: 'Membro',
    [UserRole.CONTADOR]: 'Contador',
    [UserRole.SECRETARIA]: 'Secretaria',
    [UserRole.ADMIN]: 'Administrador'
  };
  
  return roleMap[role] || 'Desconhecido';
};
