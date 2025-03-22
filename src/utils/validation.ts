export const validateEmail = (email: string): boolean => {
  const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return regex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  // Formato brasileiro: (XX) XXXXX-XXXX ou XXXXXXXXXXX
  const regex = /^\(?(\d{2})\)?[-. ]?(\d{5})[-. ]?(\d{4})$/;
  return regex.test(phone);
};

export const validatePassword = (password: string): boolean => {
  // Pelo menos 6 caracteres
  return password.length >= 6;
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 3;
};
