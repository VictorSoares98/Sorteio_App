import zxcvbn from 'zxcvbn';

interface PasswordStrength {
  score: number; // 0-4 (0 = muito fraca, 4 = muito forte)
  feedback: {
    warning: string;
    suggestions: string[];
  };
  isStrong: boolean;
  // Traduções amigáveis de nível
  strengthLevel: 'muito fraca' | 'fraca' | 'média' | 'forte' | 'muito forte';
}

// Avaliar força da senha
export function evaluatePasswordStrength(password: string): PasswordStrength {
  // Para senhas vazias, retornar resultado padrão
  if (!password) {
    return {
      score: 0,
      feedback: {
        warning: 'Senha vazia',
        suggestions: ['Digite uma senha']
      },
      isStrong: false,
      strengthLevel: 'muito fraca'
    };
  }
  
  // Avaliar com zxcvbn
  const result = zxcvbn(password);
  
  // Traduzir feedback (opcional)
  let translatedWarning = result.feedback.warning;
  let translatedSuggestions = [...result.feedback.suggestions];
  
  // Mapear scores para níveis legíveis
  const strengthLevels = [
    'muito fraca',
    'fraca',
    'média',
    'forte',
    'muito forte'
  ];
  
  return {
    score: result.score,
    feedback: {
      warning: translatedWarning || '',
      suggestions: translatedSuggestions
    },
    isStrong: result.score >= 3, // Considera forte se score for 3 ou 4
    strengthLevel: strengthLevels[result.score] as any
  };
}

// Componente para usar com Vue
export function usePasswordValidation() {
  const validatePasswordStrength = (password: string) => {
    const result = evaluatePasswordStrength(password);
    return result.isStrong || 'A senha é muito fraca. Tente uma combinação mais segura.';
  };
  
  return {
    validatePasswordStrength,
    evaluatePasswordStrength
  };
}
