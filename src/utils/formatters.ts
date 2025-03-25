import { UserRole } from '../types/user';
import { 
  MAX_AVAILABLE_NUMBERS, 
  MIN_AVAILABLE_NUMBERS, 
  NUMBER_DIGIT_COUNT 
} from './constants';

/**
 * Formata o papel do usuário para exibição em português
 */
export const formatUserRole = (role?: UserRole): string => {
  if (!role) return 'Desconhecido';
  
  const roleMap = {
    [UserRole.USER]: 'Membro',
    [UserRole.TESOUREIRO]: 'Tesoureiro',
    [UserRole.SECRETARIA]: 'Secretaria',
    [UserRole.ADMIN]: 'Administrador'
  };
  
  return roleMap[role] || 'Desconhecido';
};

/**
 * Formata número de telefone para o padrão brasileiro
 */
export const formatPhone = (phone: string): string => {
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Limita a 11 dígitos
  const limited = cleaned.substring(0, 11);
  
  // Formatar como (XX) XXXXX-XXXX se tiver 11 dígitos
  if (limited.length === 11) {
    return `(${limited.substring(0, 2)}) ${limited.substring(2, 7)}-${limited.substring(7)}`;
  }
  // Formatar como (XX) XXXX-XXXX se tiver 10 dígitos
  else if (limited.length === 10) {
    return `(${limited.substring(0, 2)}) ${limited.substring(2, 6)}-${limited.substring(6)}`;
  }
  // Formatar parcialmente o número conforme for sendo digitado
  else if (limited.length > 2) {
    // Se tiver pelo menos o DDD completo
    if (limited.length <= 7) {
      // Até completar o meio do número
      return `(${limited.substring(0, 2)}) ${limited.substring(2)}`;
    } else {
      // Após começar a digitar a parte final
      return `(${limited.substring(0, 2)}) ${limited.substring(2, 7)}-${limited.substring(7)}`;
    }
  } else if (limited.length > 0) {
    // Se começou a digitar apenas o DDD
    return `(${limited}`;
  }
  
  return limited;
};

/**
 * Formata valor para moeda brasileira
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Formata data para o formato brasileiro
 */
export const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };
  
  return new Intl.DateTimeFormat('pt-BR', options || defaultOptions).format(date);
};

/**
 * Formata número do sorteio com zeros à esquerda
 * Garante que o número tenha exatamente 5 dígitos
 */
export const formatRaffleNumber = (number: string | number): string => {
  // Converter para string se for número
  const strValue = typeof number === 'number' ? number.toString() : number;
  
  // Se o número já tem o formato correto (5 dígitos), apenas retorne
  if (new RegExp(`^\\d{${NUMBER_DIGIT_COUNT}}$`).test(strValue)) {
    return strValue;
  }
  
  // Limpa caracteres não numéricos
  const cleaned = strValue.replace(/\D/g, '');
  
  // Converter para número e garantir que está no intervalo válido
  const numValue = parseInt(cleaned, 10) || 0;
  if (numValue < MIN_AVAILABLE_NUMBERS || numValue > MAX_AVAILABLE_NUMBERS) {
    console.warn(`Número fora do intervalo permitido (${MIN_AVAILABLE_NUMBERS}-${MAX_AVAILABLE_NUMBERS}): ${numValue}`);
    // Mesmo para números inválidos, formatamos para manter a consistência da UI
    // retornando o número limitado ao intervalo válido
    const safeValue = Math.max(MIN_AVAILABLE_NUMBERS, Math.min(numValue, MAX_AVAILABLE_NUMBERS));
    return safeValue.toString().padStart(NUMBER_DIGIT_COUNT, '0');
  }
  
  // Formata para ter N dígitos com zeros à esquerda
  return numValue.toString().padStart(NUMBER_DIGIT_COUNT, '0');
};

/**
 * Normaliza um username para uso em IDs:
 * - Remove caracteres especiais
 * - Converte para minúsculas
 * - Substitui espaços por hífens
 */
export const normalizeUsername = (username: string): string => {
  if (!username) return '';
  
  // Remove acentos e caracteres especiais
  const normalized = username
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
    
  return normalized;
};

/**
 * Gera um ID para documento baseado no username
 */
export const generateDocumentId = (prefix: string, username: string): string => {
  const normalizedUsername = normalizeUsername(username);
  const timestamp = Date.now();
  const uniqueSuffix = Math.random().toString(36).substring(2, 5);
  
  return `${prefix}_${normalizedUsername}_${timestamp}_${uniqueSuffix}`;
};
