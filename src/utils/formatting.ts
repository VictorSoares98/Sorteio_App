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
