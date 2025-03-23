export const formatPhone = (phone: string): string => {
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Formata como (XX) XXXXX-XXXX
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  }
  
  return phone;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };
  
  return new Intl.DateTimeFormat('pt-BR', options || defaultOptions).format(date);
};

export const formatRaffleNumber = (number: string): string => {
  // Se o número já tem o formato correto (5 dígitos), apenas retorne
  if (/^\d{5}$/.test(number)) {
    return number;
  }
  
  // Limpa caracteres não numéricos
  const cleaned = number.replace(/\D/g, '');
  
  // Formata para ter 5 dígitos com zeros à esquerda
  return cleaned.padStart(5, '0').substring(0, 5);
};
