export const validateEmail = (email: string): boolean => {
  const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return regex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  // Primeiro remove todos os caracteres não numéricos
  const numbersOnly = phone.replace(/\D/g, '');
  
  // Verifica se tem 10 ou 11 dígitos (com ou sem DDD)
  if (numbersOnly.length !== 10 && numbersOnly.length !== 11) {
    return false;
  }

  // Se chegou aqui, o número é válido em termos de quantidade de dígitos
  return true;
};

export const validatePassword = (password: string): boolean => {
  // Pelo menos 6 caracteres
  return password.length >= 6;
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 3;
};
